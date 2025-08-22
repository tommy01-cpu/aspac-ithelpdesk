# Example of how Re## How it works:

1. **User clicks email link** → Goes to `/login` page
2. **If already logged in** → Shows loading spinner briefly, then automatically redirects to the request/approval page (no login form shown)
3. **If not logged in** → Shows login form, then redirects to the request/approval page after successful login_Link works with different environments

## Current Environment (.env.local):
```
NEXTAUTH_URL=http://localhost:3000
```

## Generated URLs:

### Request Link (with auto-login):
- **Development**: `http://localhost:3000/login?callbackUrl=%2Frequests%2Fview%2F123`
- **Staging**: `https://staging.yourdomain.com/login?callbackUrl=%2Frequests%2Fview%2F123`  
- **Production**: `https://yourdomain.com/login?callbackUrl=%2Frequests%2Fview%2F123`

### Approval Link (with auto-login):
- **Development**: `http://localhost:3000/login?callbackUrl=%2Frequests%2Fapprovals%2F123`
- **Staging**: `https://staging.yourdomain.com/login?callbackUrl=%2Frequests%2Fapprovals%2F123`
- **Production**: `https://yourdomain.com/login?callbackUrl=%2Frequests%2Fapprovals%2F123`

## How it works:

1. **User clicks email link** → Goes to `/login` page
2. **If already logged in** → Automatically redirects to the request/approval page
3. **If not logged in** → Shows login form, then redirects to the request/approval page after successful login

## To change environment:

### For Staging:
```env
NEXTAUTH_URL=https://staging.yourdomain.com
```

### For Production:
```env
NEXTAUTH_URL=https://yourdomain.com
```

The code automatically uses the correct URL from `process.env.NEXTAUTH_URL`!
