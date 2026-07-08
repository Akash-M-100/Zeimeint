variable "aws_region" {
  description = "AWS region to provision resources in."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment. Drives resource naming and tagging."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Project slug used as a prefix for resource names."
  type        = string
  default     = "zeminent-learning"
}

variable "cors_allowed_origins" {
  description = "Origins allowed to upload to / read from the videos bucket via browser (S3 CORS)."
  type        = list(string)
  default     = ["http://localhost:3000"]
}
