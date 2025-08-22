SELECT 
  id,
  name,
  type,
  is_active,
  CASE 
    WHEN html_content LIKE '%Request_Description%' THEN 'YES'
    ELSE 'NO'
  END as contains_request_description,
  CASE 
    WHEN html_content LIKE '%${Request_Description}%' THEN 'YES'
    ELSE 'NO'
  END as contains_variable,
  LENGTH(html_content) as template_length,
  html_content
FROM email_template 
WHERE type = 'REQUEST_CREATED_REQUESTER';
