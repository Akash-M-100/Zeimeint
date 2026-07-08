terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    # `local` is not in the original spec's provider list, but local_file
    # (used to write the CloudFront signing key) requires it.
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }

  # State is stored locally for now. TODO: move to a remote backend
  # (e.g. S3 + DynamoDB lock, with encryption) before this is shared or
  # used for staging/prod — local state holds the CloudFront private key
  # and IAM secret in plaintext.
}

provider "aws" {
  region = var.aws_region
}

provider "tls" {}
