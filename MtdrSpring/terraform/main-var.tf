//Copyright (c) 2022 Oracle and/or its affiliates.
//Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.
variable "ociTenancyOcid"      { default = "ocid1.tenancy.oc1..aaaaaaaab32jpf5nepirstbkntsg4kuv45ntdluw4izzvmvs6wgutphfrepq" }
variable "ociUserOcid"         { default = "ocid1.user.oc1..aaaaaaaay65zakgqjef5ottuzlq6lo4oivlcmmgymhpczg2fdgisuhgiu6eq" }
variable "ociCompartmentOcid"  { default = "ocid1.compartment.oc1..aaaaaaaao6cvbreyw2kk66wnig3i7ukedb22cmflvhmvg5mpflbiurmj5eoa" }
variable "ociRegionIdentifier" { default = "mx-queretaro-1" }
variable "mtdrDbName"          { default = "chatbotdb" }
variable "runName"             { default = "chatbotoracle" }

# mtdrKey is a unique generated id — set automatically by setup.sh
variable "mtdrKey" { default = "" }
