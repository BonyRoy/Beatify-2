# 🎵 Beatify - Music Player

A modern React application for browsing and playing music tracks with Firebase integration.

## ✨ Features

- 🎧 **Music Player**: Browse and play uploaded music tracks
- 📁 **Firebase Integration**: Secure file storage and database management
- ❤️ **Favorites**: Save your favorite tracks
- 📥 **Downloads**: Download tracks directly
- 🎨 **Modern UI**: Beautiful, responsive design

## 🚀 Quick Start

### Prerequisites

- Node.js (v20.19.0 or higher)
- npm or yarn
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd beaatify2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one
   - Enable **Firestore Database** and **Storage**
   - Go to Project Settings > General
   - Copy your Firebase configuration

4. **Configure Firebase**
   
   Create a `.env` file in the project root:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```
   
   Or update `src/firebase/config.js` directly with your Firebase credentials.

5. **Set up Firestore Database**
   
   Create a collection named `music` in Firestore with documents containing:
   ```javascript
   {
     trackName: "Song Name",
     artist: "Artist Name",
     album: "Album Name",
     genre: "Genre",
     duration: "3:42", // or in seconds
     fileSize: "4.2 MB",
     filePath: "music/song.mp3", // path in Firebase Storage
     albumArtPath: "images/album.jpg", // optional
     releaseDate: "2024-01-01", // optional
     createdAt: Timestamp // Firestore timestamp
   }
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
beaatify2/
├── src/
│   ├── pages/
│   │   ├── Home.jsx          # Music player page
│   │   └── Admin.jsx         # Admin upload page
│   ├── components/           # Reusable components
│   ├── firebase/
│   │   └── config.js         # Firebase configuration
│   ├── services/
│   │   └── musicService.js   # Music fetching service
│   └── App.jsx               # Main app with routing
├── .env                      # Environment variables (create this)
└── package.json
```

## 🔥 Firebase Setup Details

### Firestore Rules (Development)

For development, you can use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /music/{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

### Storage Rules (Development)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

**⚠️ Note**: These rules are for development only. Implement proper authentication and security rules for production.

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📝 Usage

### Music Player (`/`)

- Browse all uploaded music tracks
- Click the download icon to download tracks
- Click the heart icon to add tracks to favorites
- Favorites and downloads are saved in localStorage

### Admin Panel (`/admin`)

- Upload new music tracks (to be implemented)
- Manage music metadata

## 🐛 Troubleshooting

### Common Issues

1. **Permission Denied**: Check Firebase security rules
2. **File Upload Fails**: Verify Firebase Storage is enabled
3. **Config Errors**: Double-check Firebase configuration values
4. **No Music Showing**: Ensure Firestore collection is named `music` and documents have correct fields

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
