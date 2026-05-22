#!/bin/bash
# Copyright (c) 2022 Oracle and/or its affiliates.
# Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

# Fail on error
set -e

# Provision Cluster, DBs, etc with terraform (and wait)
if ! state_done PROVISIONING; then
  cd $MTDRWORKSHOP_LOCATION/terraform
  export TF_VAR_ociTenancyOcid="$(state_get TENANCY_OCID)"
  export TF_VAR_ociUserOcid="$(state_get USER_OCID)"
  export TF_VAR_ociCompartmentOcid="$(state_get COMPARTMENT_OCID)"
  export TF_VAR_ociRegionIdentifier="$(state_get REGION)"
  export TF_VAR_runName="$(state_get RUN_NAME)"
  export TF_VAR_mtdrDbName="$(state_get MTDR_DB_NAME)"
  export TF_VAR_mtdrKey="$(state_get MTDR_KEY)"
  #export TF_VAR_inventoryDbName="$(state_get INVENTORY_DB_NAME)"

  if state_done K8S_PROVISIONING; then
    rm -f containerengine.tf core.tf
  fi
## appending the output of cat into the file terraform rc
  cat >~/.terraformrc <<!
provider_installation {
  filesystem_mirror {
    path    = "/usr/share/terraform/plugins"
  }
  direct {
  }
}
!

  if ! terraform init; then
    echo 'ERROR: terraform init failed!'
    exit
  fi

  # Si el cluster OKE ya existe en el estado de Terraform, eliminarlo de OCI y del estado
  # antes de apply para evitar el error "version lower than existing version".
  if terraform state list 2>/dev/null | grep -q "oci_containerengine_cluster.mtdrworkshop_cluster"; then
    CLUSTER_OCID=$(terraform state show oci_containerengine_cluster.mtdrworkshop_cluster 2>/dev/null \
      | grep '^\s*id\s*=' | head -1 | sed 's/.*"\(.*\)".*/\1/')
    if test -n "$CLUSTER_OCID"; then
      echo "Cluster OKE detectado en estado ($CLUSTER_OCID). Eliminando de OCI para recreación en v1.34.2..."
      oci ce cluster delete --cluster-id "$CLUSTER_OCID" --force 2>/dev/null || true
      for i in $(seq 1 40); do
        STATUS=$(oci ce cluster get --cluster-id "$CLUSTER_OCID" \
          --query 'data."lifecycle-state"' --raw-output 2>/dev/null || echo "DELETED")
        echo "Estado del cluster: $STATUS"
        if [ "$STATUS" = "DELETED" ] || [ -z "$STATUS" ]; then
          echo "Cluster OKE eliminado."
          break
        fi
        sleep 15
      done
      if [ "$STATUS" != "DELETED" ] && [ -n "$STATUS" ]; then
        echo "ERROR: Cluster OKE no eliminado después de 10 minutos. Abortando."
        exit 1
      fi
    fi
    terraform state rm oci_containerengine_cluster.mtdrworkshop_cluster 2>/dev/null || true
    terraform state rm oci_containerengine_node_pool.oke_node_pool 2>/dev/null || true
    echo "Recursos OKE eliminados del estado de Terraform."
  fi

  if ! terraform apply -auto-approve; then
    echo 'ERROR: terraform apply failed!'
    exit
  fi

  cd $MTDRWORKSHOP_LOCATION
  state_set_done K8S_PROVISIONING
  state_set_done PROVISIONING
fi


