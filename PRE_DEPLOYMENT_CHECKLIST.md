# Pre-Deployment Checklist

## ✅ Before Pushing to GitHub

### 1. **Verify All Files Are Ready**
- [x] Dockerfile is production-ready
- [x] All dependencies are in package.json
- [x] .env.example exists (template for environment variables)
- [x] .gitignore excludes sensitive files (.env, node_modules, dist)
- [x] README.md has deployment instructions

### 2. **Test Locally (Optional but Recommended)**
```bash
# Build the frontend
npm run build

# Test the server locally
NODE_ENV=production node server.js
```

### 3. **Check Git Status**
```bash
git status
# Make sure only intended files are staged
# .env should NOT be committed
# node_modules should NOT be committed
```

### 4. **Commit and Push**
```bash
git add .
git commit -m "Production-ready: Fixed Dockerfile, error handling, and deployment config"
git push origin main
```

### 5. **After Pushing to GitHub**

#### For Railway Deployment:
1. Go to [Railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Select your repository: `DarkWebMonitoringSystem`
4. Railway will auto-detect the Dockerfile
5. **Set Environment Variables** in Railway dashboard:
   - `NODE_ENV=production`
   - `PORT=3000` (or Railway's assigned port)
   - `ALLOWED_ORIGINS=*` (or your domain)
   - `ENABLE_DEBUG_LOGS=false` (optional)

6. Railway will automatically:
   - Build the Docker image
   - Install Tor daemon
   - Build the frontend
   - Start the server

7. **Generate Public URL** in Railway:
   - Go to Settings → Generate Domain
   - Copy the public URL
   - Update `ALLOWED_ORIGINS` if needed

### 6. **Verify Deployment**
- [ ] Check Railway build logs (should succeed)
- [ ] Visit the public URL
- [ ] Test scanning a surface web URL (e.g., `https://example.com`)
- [ ] Test scanning a dark web URL (e.g., `.onion` URL) - may take longer

### 7. **Troubleshooting**

**If build fails:**
- Check Railway build logs
- Verify Dockerfile syntax
- Ensure all dependencies are in package.json

**If app doesn't work:**
- Check Railway deploy logs
- Verify environment variables are set
- Check if Tor is running (should be automatic in Docker)

**If JSON parsing errors:**
- Already fixed in the code
- Check Railway logs for server errors

## 🚀 Ready to Deploy!

Your app is now production-ready. Just push to GitHub and deploy on Railway!

