# Origin Access Control — CloudFront signs requests to S3 with SigV4 so the
# bucket can stay fully private (no OAI, no public bucket).
resource "aws_cloudfront_origin_access_control" "videos" {
  name                              = "${var.project_name}-${var.environment}-oac"
  description                       = "OAC for ${var.project_name} videos (${var.environment})"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# RSA keypair used to sign CloudFront URLs/cookies. The private key is consumed
# by the backend to mint signed URLs; the public key is registered with
# CloudFront via the key group below.
resource "tls_private_key" "cloudfront_signing" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Write the private key to disk for the backend to load.
# IMPORTANT: this file is gitignored and 0600 — it is a secret. (It also lives
# in Terraform state in plaintext; protect the state file accordingly.)
resource "local_file" "cloudfront_private_key" {
  content         = tls_private_key.cloudfront_signing.private_key_pem
  filename        = "${path.module}/cloudfront-private-key.pem"
  file_permission = "0600"
}

resource "aws_cloudfront_public_key" "cloudfront_signing" {
  name        = "${var.project_name}-${var.environment}-signing-key"
  comment     = "Signing public key for ${var.project_name} (${var.environment})"
  encoded_key = tls_private_key.cloudfront_signing.public_key_pem
}

resource "aws_cloudfront_key_group" "videos" {
  name    = "${var.project_name}-${var.environment}-key-group"
  comment = "Trusted key group for signed video URLs (${var.environment})"
  items   = [aws_cloudfront_public_key.cloudfront_signing.id]
}

# AWS-managed CachingOptimized policy — good defaults for static media.
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "videos" {
  enabled             = true
  default_root_object = "" # No root object — this is a video CDN, not a site.
  price_class         = "PriceClass_All"
  comment             = "${var.project_name} videos (${var.environment})"

  origin {
    domain_name              = aws_s3_bucket.videos.bucket_regional_domain_name
    origin_id                = "s3-videos"
    origin_access_control_id = aws_cloudfront_origin_access_control.videos.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-videos"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id

    # Require signed URLs/cookies from the backend's key group.
    trusted_key_groups = [aws_cloudfront_key_group.videos.id]
  }

  viewer_certificate {
    # Use the default *.cloudfront.net cert for now; custom domain comes later.
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
