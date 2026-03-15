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

var acrCreds = listCredentials(acr.id, acr.apiVersion)
var acrUser = acrCreds.username
var acrPass = acrCreds.passwords[0].value

resource app 'Microsoft.App/containerApps@2023-05-01' = {
  name: appName
  location: location
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 4321
        transport: 'auto'
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acrUser
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acrPass
        }
      ]
    }
    template: {
      containers: [
        {
          name: appName
          image: '${acr.properties.loginServer}/${appName}:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }
}

output acrName string = acr.name
output acrLoginServer string = acr.properties.loginServer
output containerAppName string = app.name
