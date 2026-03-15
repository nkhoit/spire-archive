@description('Deployment location')
param location string = 'westus2'

@description('Base name for resources (also used for Container App name)')
param appName string = 'sts1-data'

var acrName = toLower(replace('${appName}acr', '-', ''))

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

resource env 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${appName}-env'
  location: location
  properties: {}
}

output acrName string = acr.name
output acrLoginServer string = acr.properties.loginServer
output envName string = env.name
