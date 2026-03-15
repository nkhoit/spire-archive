#!/usr/bin/env bash
set -euo pipefail

LOCATION=${LOCATION:-westus2}
APP_NAME=${APP_NAME:-sts1-data}
RG=${RG:-${APP_NAME}-rg}
TAG=${TAG:-$(date +%Y%m%d%H%M%S)}

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

echo "==> Using RG=$RG LOCATION=$LOCATION APP_NAME=$APP_NAME TAG=$TAG"

echo "==> Creating resource group (if needed)"
az group create -n "$RG" -l "$LOCATION" >/dev/null

echo "==> Deploying Bicep"
DEPLOY_JSON=$(az deployment group create \
  -g "$RG" \
  -f "$ROOT_DIR/infra/main.bicep" \
  -p location="$LOCATION" appName="$APP_NAME" \
  -o json)

ACR_NAME=$(echo "$DEPLOY_JSON" | jq -r '.properties.outputs.acrName.value')
ACR_LOGIN=$(echo "$DEPLOY_JSON" | jq -r '.properties.outputs.acrLoginServer.value')

echo "==> ACR: $ACR_NAME ($ACR_LOGIN)"

echo "==> Logging in to ACR"
az acr login -n "$ACR_NAME" >/dev/null

IMAGE="$ACR_LOGIN/$APP_NAME:$TAG"
LATEST="$ACR_LOGIN/$APP_NAME:latest"

echo "==> Building image: $IMAGE"
docker build -t "$IMAGE" -t "$LATEST" "$ROOT_DIR"

echo "==> Pushing image"
docker push "$IMAGE"
docker push "$LATEST"

echo "==> Updating Container App"
az containerapp update \
  -g "$RG" \
  -n "$APP_NAME" \
  --image "$IMAGE" >/dev/null

FQDN=$(az containerapp show -g "$RG" -n "$APP_NAME" --query properties.configuration.ingress.fqdn -o tsv)

echo "==> Done"
echo "URL: https://$FQDN/"
