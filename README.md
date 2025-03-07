# Golf Guru - AI Golf Swing Analysis

Golf Guru is an AI-powered golf swing analysis application that helps golfers improve their game by providing detailed analysis and personalized recommendations.

## Features

- **AI Swing Analysis**: Upload your golf swing videos for instant AI-powered analysis
- **Detailed Metrics**: Get scored on multiple aspects of your swing including stance, grip, backswing, and more
- **Custom Recommendations**: Receive actionable tips to improve your specific swing issues
- **Progress Tracking**: Monitor your improvement over time with visual charts and statistics
- **Pro Comparison**: Compare your swing with professional golfers to see where you can improve
- **User Profiles**: Save your swing history and progress with Google authentication

## Tech Stack

- React.js for the frontend UI
- Firebase (Authentication, Firestore, Storage) for user management and data storage
- Gemini API for AI video analysis
- Google Cloud for backend services

## Setup Instructions

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm or yarn
- A Google Cloud account for Firebase and Gemini API
- Git

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/golf-guru.git
   cd golf-guru
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up Firebase project:
   - Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Enable Authentication with Google Sign-in method
   - Create a Firestore database
   - Set up Firebase Storage

4. Set up Gemini API:
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Create an API key for the Gemini model

5. Create a `.env` file in the root directory with the following content:
   ```
   REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key_here
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

6. Start the development server:
   ```
   npm start
   ```

7. Build for production:
   ```
   npm run build
   ```

## Deployment

The application can be deployed to Firebase Hosting with these steps:

1. Install Firebase CLI:
   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```
   firebase login
   ```

3. Initialize Firebase project:
   ```
   firebase init
   ```
   - Select Hosting
   - Select your Firebase project
   - Set build as your public directory
   - Configure as a single-page app

4. Deploy to Firebase:
   ```
   firebase deploy
   ```

## Project Structure

```
golf-guru/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Dashboard.js
│   │   ├── Login.js
│   │   ├── Navigation.js
│   │   ├── ProComparison.js
│   │   ├── SwingAnalysis.js
│   │   ├── SwingTracker.js
│   │   ├── UserProfile.js
│   │   └── VideoUpload.js
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── firebase/
│   │   └── firebase.js
│   ├── services/
│   │   ├── firestoreService.js
│   │   └── geminiService.js
│   ├── App.css
│   ├── App.js
│   └── index.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## License

This project is licensed under the MIT License.

## Creators

- Max Levitin
- Rob Montoro

---

Happy golfing! 🏌️‍♂️