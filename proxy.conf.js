const PROXY_CONFIG = [
  {
      context: [
          "/catalog/list",
          "/catalog/search",
          "/catalog/add",
          "/catalog/remove",
          "/login"
      ],
      target: "http://192.168.15.11:4040",
      secure: false
  }
]

module.exports = PROXY_CONFIG;