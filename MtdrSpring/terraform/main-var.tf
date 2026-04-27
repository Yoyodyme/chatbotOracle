//Copyright (c) 2022 Oracle and/or its affiliates.
//Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.
# These values should be supplied via terraform.tfvars or environment variables
# to avoid committing tenancy/user/compartment identifiers in the repository.
variable "ociTenancyOcid"      { default = "" }
variable "ociUserOcid"         { default = "" }
variable "ociCompartmentOcid"  { default = "" }
variable "ociRegionIdentifier" { default = "mx-queretaro-1" }
variable "mtdrDbName"          { default = "chatbotdb" }
variable "runName"             { default = "chatbotoracle" }

# mtdrKey is a unique generated id — set automatically by setup.sh
variable "mtdrKey" { default = "" }

# Your SSH public key for OKE node access (optional — leave empty to disable SSH)
variable "sshPublicKey" { default = "" }
