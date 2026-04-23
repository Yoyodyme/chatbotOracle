terraform {
  required_providers {
    oci = {
      source  = "hashicorp/oci"
      version = "4.42.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.ociTenancyOcid
  user_ocid        = var.ociUserOcid
  fingerprint      = "75:ca:da:de:00:24:40:0c:bc:b4:b0:d1:da:95:b5:9e"
  private_key_path = "~/.oci/oci_api_key.pem"
  region           = var.ociRegionIdentifier
}
