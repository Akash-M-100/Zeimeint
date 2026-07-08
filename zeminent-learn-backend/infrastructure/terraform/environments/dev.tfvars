environment          = "dev"
aws_region           = "ap-south-1"
# Admin panel (:3001) uploads videos directly to S3 from the browser, so its
# origin must be allowed by the bucket CORS. :3000 kept for the student app.
cors_allowed_origins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://learning.zeminent.com",
  "https://admin.learning.zeminent.com"
]