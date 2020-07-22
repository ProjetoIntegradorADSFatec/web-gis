import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpHeaderResponse } from '@angular/common/http';
import { Response } from '../entity/responses/response';
import { Catalog } from '../entity/models/catalog';
import { User } from '../entity/models/user';
import { ResponseToken } from '../entity/models/response-token';
import { Geojson } from '../entity/geojson/geojson';

@Injectable({
  providedIn: 'root'
})
export class ApiRestfulService {
  private httpOptions = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE'
  };

  private admin: boolean = false;

  constructor(private httpClient: HttpClient) { }

  async login(user: User) {
    await this.httpClient.post<ResponseToken>('/login', user, { headers: new HttpHeaders(this.httpOptions) }).toPromise().then(
      (response: ResponseToken) => {
        this.httpOptions['token'] = response.token;
        this.admin = response.user.role.includes(("role_admin").toUpperCase());
      }
    );
  }

  logout() {
    delete this.httpOptions['token'];
    this.admin = false;
  }

  getCatalogList() {
    return this.httpClient.get<Response>('/catalog/list', { headers: new HttpHeaders(this.httpOptions) });
  }

  postSearchRequest(requestBody: Geojson) {
    return this.httpClient.post<Response>('/catalog/search', requestBody, { headers: new HttpHeaders(this.httpOptions) });
  }

  postAddCatalogItem(catalog: Catalog) {
    return this.httpClient.post<Catalog>('/catalog/add', catalog, { headers: new HttpHeaders(this.httpOptions) });
  }

  deleteCatalogItem(id: number) {
    return this.httpClient.delete<Catalog>('/catalog/remove?id=' + id.toString(), { headers: this.httpOptions });
  }

  isAdmin() {
    return this.admin;
  }

  isValue(data: any): boolean {
    return data != undefined && data != null;
  }
}
