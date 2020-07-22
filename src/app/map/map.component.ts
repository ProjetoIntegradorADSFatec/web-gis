import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import {OSM, Vector as VectorSource} from 'ol/source.js'

// Funcões laterais do Mapa
import FullScreen from 'ol/control/FullScreen';
import DragRotateAndZoom from 'ol/interaction/DragRotateAndZoom';
import DragAndDrop from 'ol/interaction/DragAndDrop';
import MousePosition from 'ol/control/MousePosition.js';
import { defaults as defaultControls, ScaleLine } from 'ol/control.js';
import { createStringXY } from 'ol/coordinate.js';

// Criação de desenhos e polígonos
import Draw from 'ol/interaction/Draw.js';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';

// Integração com a API
import { Geojson } from '../entity/geojson/geojson';
import { Response } from '../entity/responses/response';
import { User } from '../entity/models/user';
import { ApiRestfulService } from '../services/api-restful-service';

// Controle de armazenamento de informações
import { Store, select } from '@ngrx/store';
import { StorageModel } from '../entity/models/storage-model';
import { Update } from '../services/store/action-types';
import { Router } from '@angular/router';
import { Feature as Item } from '../entity/responses/feature';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  // Controle do Mapa
  public date;
  public map;
  public features;
  public visible;
  public draw;
  public draw_bool;
  public source;
  public coord;

  // Análise de resultados
  public cloud_percent;
  public geojson;
  public response: Response;
  public imagesToDownload: Item[];
  public downloadImage: any;
  public toStore: StorageModel;

  // Criando camadas
  public vector;
  public raster;
  public base;

  // Integração com a API
  constructor(private storage: Store<StorageModel>, private service: ApiRestfulService, private router: Router) {
    this.imagesToDownload = [];
    this.downloadImage = {};
    this.cloud_percent = 50;
    this.draw_bool = true;
    this.source = new VectorSource({ wrapX: false });
    // Criando camadas
    this.vector = new VectorLayer({
      source: this.source
    });
    this.raster = new TileLayer({
      source: new OSM()
    });
    this.base = new TileLayer({
      preload: Infinity,
      visible: true,
      title: "osm",
      baseLayer: true,
      source: new OSM(),
      layer: 'osm',
    })
    // Recuperando dados do armazenamento
    this.toStore = new StorageModel();
    try {
      let data: any = this.storage.pipe(select('user'));
      this.toStore.setUser(data.actionsObserver._value.payload.user);
      this.service.login(this.toStore.user);
    } catch (error) {
      this.toStore.user = null
    }
  }

  ngOnInit() {
    this.loginAPI();
    this.initilizeMap();
    this.initItens();
  }

  // Controle de usuários
  login() {
    this.router.navigate([""]);
  }

  logout() {
    this.toStore = new StorageModel();
    this.storage.dispatch(Update(this.toStore));
    this.service.logout();
    this.router.navigate([""]);
  }

  loginAPI() {
    if (this.service.isValue(this.toStore.user)) {
      this.service.login(this.toStore.user);
    }
  }

  userIsLoged(): boolean {
    return this.service.isValue(this.toStore.user);
  }

  userIsAdmin(): boolean {
    return this.service.isAdmin();
  }

  // Configurações da busca
  async initItens() {
    await this.service.getCatalogList().toPromise().then(
      (data: Response) => {
        this.response = data;
      }
    );
    this.response.features.forEach(
      (data: Item) => {
        this.downloadImage[data.id] = false;
      }
    );
  }

  thereIsDataToDisplay(): boolean {
    return this.service.isValue(this.response);
  }

  // Iniciar as configurações do mapa
  initilizeMap() {
    this.features = [this.base];

    var view = new View({
      center: [-6124801.2015823, -1780692.0106836],
      zoom: 5
    });

    var mousePositionControl = new MousePosition({
      coordinateFormat: createStringXY(4),
      projection: 'EPSG:4326', /** 3857 */
      className: 'custom-mouse-position',
      target: document.getElementById('mouse-position'),
      undefinedHTML: '0.0000, 0.0000'
    });

    this.map = new Map({
      controls: defaultControls().extend([mousePositionControl, new FullScreen(), new DragRotateAndZoom(), new DragAndDrop()], new ScaleLine({units: 'degrees'})),
      layers: this.features,
      target: 'map',
      view: view
    });

    if ( this.userIsLoged() ) {
      this.addInteraction();
    } else {
      this.removeInteraction();
    }
  }

  addInteraction() {
    this.map.addLayer(this.raster);
    this.map.addLayer(this.vector);
    this.draw = new Draw({
      source: this.source,
      type: "Polygon"
    });
    this.map.addInteraction(this.draw);
  }

  removeInteraction() {
    this.map.removeLayer(this.vector);
    this.map.removeLayer(this.raster);
    this.draw = null;
  }

  cleanAll () {
    this.map.removeLayer(this.vector);
    this.map.removeLayer(this.raster);
    this.draw = null;
    this.source = new VectorSource({ wrapX: false });
    this.vector = new VectorLayer({
      source: this.source
    });
    this.raster = new TileLayer({
      source: new OSM()
    });
  }

  formatGeojson() {
    var geom = [];
    this.vector.getSource().forEachFeature(
      function(feature) {
        geom.push(new Feature(feature.getGeometry().clone().transform('EPSG:3857', 'EPSG:4326')));
      }
    );
    this.geojson = JSON.parse(
      new GeoJSON().writeFeatures(geom)
    );
  }

  async search() {
    this.formatGeojson();
    try {
      let request: Geojson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              band: "VV",
              projection: "EPSG:4326",
              datetime: {
                start: "2010-01-01",
                end: "2018-12-31"
              }
            },
            geometry: this.geojson.features[0].geometry
          }
        ]
      };
      await this.service.postSearchRequest(request).toPromise().then(
        (data: Response) => {
          this.response = data
        }
      );
      this.storage.dispatch(Update(this.toStore));
    } catch (error) {
      alert(error);
    }
  }

  download() {
    for (let item of this.response.features) {
      if (this.downloadImage[item.id] == true) {
        this.imagesToDownload.push(item);
      }
    }
    if (this.imagesToDownload.length != 0) {
      alert("Download " + this.imagesToDownload.length + " selected images?");
    } else {
      alert("Select images to download!")
    }
    this.imagesToDownload = [];
  }

  thereIsImagesToDownload(): boolean {
    let result: boolean = false;
    for (let item of this.response.features) {
      result = result || this.downloadImage[item.id];
    }
    return result;
  }
}
