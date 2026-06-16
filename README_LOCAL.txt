# How to run Krishan Transport System locally

1. Make sure you have Node.js installed.
2. Double-click the `run-locally.bat` file in the main folder.
3. Two separate terminal windows will open:
   - One for the **Backend** (port 5000)
   - One for the **Frontend** (port 5173)
4. The system should automatically open in your browser at `http://localhost:5173`.

### Troubleshooting
- If the backend fails to connect, check your internet connection (needed for MongoDB Atlas).
- If dependencies are missing, run `npm install` inside both `frontend` and `backend` folders.
