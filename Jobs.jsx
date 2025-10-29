import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  updateDoc,
  Timestamp,
  setLogLevel,
} from 'firebase/firestore';


// --- Firebase Configuration ---
// These variables are provided by the environment.
const firebaseConfig = JSON.parse(
  typeof __firebase_config !== 'undefined'
    ? __firebase_config
    : '{}'
);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';


// --- Hardcoded Owner Credentials (PROTOTYPE ONLY - NOT SECURE) ---
const OWNER_EMAIL = 'eestleman2030@bcsstudent.org';
const OWNER_PASSWORD = 'Ecoloc@tion14';


// --- Helper Functions for Firestore Paths ---
const getPublicCollectionPath = (collectionName) => {
  return `/artifacts/${appId}/public/data/${collectionName}`;
};


// --- React Components ---


/**
 * A reusable Card component
 */
const Card = ({ children, className = '' }) => (
  <div
    className={`bg-white shadow-md rounded-lg p-6 m-4 ${className}`}
  >
    {children}
  </div>
);


/**
 * A reusable Button component
 */
const Button = ({ children, onClick, className = '', type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    className={`bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-150 ease-in-out ${className}`}
  >
    {children}
  </button>
);


/**
 * A reusable Input component
 */
const Input = ({ type = 'text', placeholder, value, onChange, className = '' }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
);


/**
 * A reusable Textarea component
 */
const Textarea = ({ placeholder, value, onChange, className = '', rows = 3 }) => (
  <textarea
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    rows={rows}
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
);


/**
 * Loading Spinner
 */
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
  </div>
);


/**
 * Login Screen Component
 */
const LoginScreen = ({ onLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');


  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
          Job Assignment Portal
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </Card>
    </div>
  );
};


/**
 * Owner Panel Component
 */
const OwnerPanel = ({ db, userId, onLogout }) => {
  const [page, setPage] = useState('workers'); // 'workers', 'jobs', 'assign'
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);


  // --- State for Forms ---
  const [workerName, setWorkerName] = useState('');
  const [workerEmail, setWorkerEmail] = useState('');
  const [workerPassword, setWorkerPassword] = useState('');


  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobReward, setJobReward] = useState('');
  const [jobAssignee, setJobAssignee] = useState('');
  
  const [message, setMessage] = useState('');


  // --- Firestore Refs ---
  const workersRef = useMemo(() => collection(db, getPublicCollectionPath('workers')), [db]);
  const jobsRef = useMemo(() => collection(db, getPublicCollectionPath('jobs')), [db]);
  const notifsRef = useMemo(() => collection(db, getPublicCollectionPath('notifications')), [db]);
  
  // --- Data Listeners ---
  useEffect(() => {
    // Listen for workers
    const unsubWorkers = onSnapshot(workersRef, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });


    // Listen for jobs
    const unsubJobs = onSnapshot(jobsRef, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });


    // Listen for notifications
    const notifQuery = query(notifsRef, where('read', '==', false));
    const unsubNotifs = onSnapshot(notifQuery, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });


    return () => {
      unsubWorkers();
      unsubJobs();
      unsubNotifs();
    };
  }, [workersRef, jobsRef, notifsRef]);


  // --- Form Handlers ---
  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!workerName || !workerEmail || !workerPassword) {
        setMessage('All worker fields are required.');
        return;
    }
    // WARNING: Storing plain text passwords! NOT SECURE!
    try {
      await addDoc(workersRef, {
        name: workerName,
        email: workerEmail,
        password: workerPassword, 
      });
      setMessage('Worker added successfully!');
      setWorkerName('');
      setWorkerEmail('');
      setWorkerPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error("Error adding worker: ", err);
      setMessage('Failed to add worker.');
      setTimeout(() => setMessage(''), 3000);
    }
  };


  const handleAssignJob = async (e) => {
    e.preventDefault();
     if (!jobTitle || !jobDesc || !jobReward || !jobAssignee) {
        setMessage('All job fields are required.');
        return;
    }
    try {
      await addDoc(jobsRef, {
        title: jobTitle,
        description: jobDesc,
        reward: parseFloat(jobReward),
        assignedToId: jobAssignee,
        assignedToName: workers.find(w => w.id === jobAssignee)?.name || 'Unknown',
        status: 'pending',
        createdAt: Timestamp.now(),
      });
      setMessage('Job assigned successfully!');
      setJobTitle('');
      setJobDesc('');
      setJobReward('');
      setJobAssignee('');
      setPage('jobs');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error("Error assigning job: ", err);
      setMessage('Failed to assign job.');
      setTimeout(() => setMessage(''), 3000);
    }
  };
  
  const handleMarkNotifRead = async (notifId) => {
    try {
        const notifDocRef = doc(db, getPublicCollectionPath('notifications'), notifId);
        await updateDoc(notifDocRef, { read: true });
    } catch (err) {
        console.error("Error marking notification read: ", err);
    }
  };


  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-700">Owner Panel</h1>
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative group">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341A6.002 6.002 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              )}
              {/* Notifications Dropdown */}
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-10 hidden group-hover:block">
                <div className="py-2">
                  <h3 className="font-semibold text-gray-800 px-4">Notifications</h3>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <p className="text-gray-500 px-4 py-2">No new notifications.</p>
                    ) : (
                        notifications.map(notif => (
                            <div key={notif.id} className="px-4 py-2 border-b border-gray-200 hover:bg-gray-100">
                                <p className="text-sm text-gray-700">{notif.message}</p>
                                <Button onClick={() => handleMarkNotifRead(notif.id)} className="text-xs py-1 px-2 bg-blue-100 text-blue-700 hover:bg-blue-200 mt-1">
                                    Mark as read
                                </Button>
                            </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <Button onClick={onLogout} className="bg-red-500 hover:bg-red-600">
              Logout
            </Button>
          </div>
        </nav>
        {/* Tabs */}
        <div className="container mx-auto px-6">
          <div className="flex border-b border-gray-300">
            <button
              onClick={() => setPage('workers')}
              className={`py-2 px-4 font-semibold ${page === 'workers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            >
              Manage Workers
            </button>
            <button
              onClick={() => setPage('jobs')}
              className={`py-2 px-4 font-semibold ${page === 'jobs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            >
              View Jobs
            </button>
             <button
              onClick={() => setPage('assign')}
              className={`py-2 px-4 font-semibold ${page === 'assign' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            >
              Assign New Job
            </button>
          </div>
        </div>
      </header>


      {/* Page Content */}
      <main className="container mx-auto p-6">
        <p className="text-sm text-gray-500 mb-4">Firebase User ID: {userId} (Owner)</p>
        {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{message}</div>}


        {/* --- Manage Workers Page --- */}
        {page === 'workers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-bold text-blue-700 mb-4">Add New Worker</h2>
              <form onSubmit={handleAddWorker} className="space-y-4">
                <Input placeholder="Worker Name" value={workerName} onChange={e => setWorkerName(e.target.value)} />
                <Input type="email" placeholder="Worker Email" value={workerEmail} onChange={e => setWorkerEmail(e.target.value)} />
                <Input placeholder="Worker Password (Not Secure!)" value={workerPassword} onChange={e => setWorkerPassword(e.target.value)} />
                <Button type="submit">Add Worker</Button>
              </form>
            </Card>
            <Card className="md:col-span-1">
              <h2 className="text-xl font-bold text-blue-700 mb-4">All Workers ({workers.length})</h2>
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {workers.map(worker => (
                  <li key={worker.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="font-semibold text-gray-800">{worker.name}</p>
                    <p className="text-sm text-gray-600">{worker.email}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}


        {/* --- View Jobs Page --- */}
        {page === 'jobs' && (
          <Card>
            <h2 className="text-xl font-bold text-blue-700 mb-4">All Jobs ({jobs.length})</h2>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {jobs.map(job => (
                    <div key={job.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">{job.title}</h3>
                             <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                 job.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 
                                 job.status === 'completed' ? 'bg-green-200 text-green-800' : ''
                             }`}>
                                {job.status}
                            </span>
                        </div>
                        <p className="text-gray-600 mt-2">{job.description}</p>
                        <div className="flex justify-between items-end mt-3">
                            <div>
                                <p className="text-sm text-gray-500">Assigned to: <span className="font-medium text-gray-700">{job.assignedToName}</span></p>
                            </div>
                            <p className="text-lg font-bold text-green-600">${job.reward}</p>
                        </div>
                    </div>
                ))}
            </div>
          </Card>
        )}
        
        {/* --- Assign Job Page --- */}
        {page === 'assign' && (
            <Card className="max-w-2xl mx-auto">
                <h2 className="text-xl font-bold text-blue-700 mb-4">Assign New Job</h2>
                <form onSubmit={handleAssignJob} className="space-y-4">
                    <Input placeholder="Job Title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                    <Textarea placeholder="Job Description" value={jobDesc} onChange={e => setJobDesc(e.target.value)} />
                    <Input type="number" placeholder="Reward ($)" value={jobReward} onChange={e => setJobReward(e.target.value)} />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign To:</label>
                        <select
                            value={jobAssignee}
                            onChange={e => setJobAssignee(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select a worker</option>
                            {workers.map(worker => (
                                <option key={worker.id} value={worker.id}>{worker.name} ({worker.email})</option>
                            ))}
                        </select>
                    </div>
                    <Button type="submit">Assign Job</Button>
                </form>
            </Card>
        )}
      </main>
    </div>
  );
};


/**
 * Worker Panel Component
 */
const WorkerPanel = ({ db, userId, worker, onLogout }) => {
    const [myJobs, setMyJobs] = useState([]);
    const [message, setMessage] = useState('');


    // --- Firestore Refs ---
    const jobsRef = useMemo(() => collection(db, getPublicCollectionPath('jobs')), [db]);
    
    // --- Data Listener ---
    useEffect(() => {
        if (!worker) return;
        
        const jobsQuery = query(jobsRef, where("assignedToId", "==", worker.id), where("status", "==", "pending"));
        
        const unsubJobs = onSnapshot(jobsQuery, (snapshot) => {
            setMyJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });


        return () => unsubJobs();
    }, [jobsRef, worker]);


    const handleMarkDone = async (job) => {
        try {
            // Update job status
            const jobDocRef = doc(db, getPublicCollectionPath('jobs'), job.id);
            await updateDoc(jobDocRef, { status: 'completed' });


            // Send notification to owner
            const notifsRef = collection(db, getPublicCollectionPath('notifications'));
            await addDoc(notifsRef, {
                message: `Job "${job.title}" completed by ${worker.name}.`,
                read: false,
                createdAt: Timestamp.now()
            });


            setMessage('Job marked as complete! Owner has been notified.');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error("Error marking job done: ", err);
            setMessage('Failed to update job status.');
            setTimeout(() => setMessage(''), 3000);
        }
    };


  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">Worker Dashboard</h1>
            <p className="text-gray-600">Welcome, {worker?.name}!</p>
          </div>
          <Button onClick={onLogout} className="bg-red-500 hover:bg-red-600">
            Logout
          </Button>
        </nav>
      </header>


      {/* Page Content */}
       <main className="container mx-auto p-6">
        <p className="text-sm text-gray-500 mb-4">Firebase User ID: {userId} (Worker)</p>
        {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{message}</div>}


        <Card>
            <h2 className="text-xl font-bold text-blue-700 mb-4">My Pending Jobs ({myJobs.length})</h2>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {myJobs.length === 0 ? (
                    <p className="text-gray-500">You have no pending jobs. Great work!</p>
                ) : (
                    myJobs.map(job => (
                        <div key={job.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">{job.title}</h3>
                                    <p className="text-lg font-bold text-green-600 mt-1">${job.reward}</p>
                                </div>
                                <Button onClick={() => handleMarkDone(job)} className="bg-green-500 hover:bg-green-600">
                                    Mark as Done
                                </Button>
                            </div>
                            <p className="text-gray-600 mt-2">{job.description}</p>
                        </div>
                    ))
                )}
            </div>
          </Card>
      </main>
    </div>
  );
};


/**
 * Main App Component
 */
function App() {
  // Firebase state
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);


  // App state
  const [userRole, setUserRole] = useState(null); // null | 'owner' | 'worker'
  const [currentUser, setCurrentUser] = useState(null); // Holds worker doc if role is 'worker'
  const [error, setError] = useState(null);


  // --- Initialize Firebase ---
  useEffect(() => {
    try {
      if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        setAuth(authInstance);
        setDb(dbInstance);
        setLogLevel('Debug');


        // --- Firebase Auth Listener ---
        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
          if (user) {
            // User is signed in
            setUserId(user.uid);
            setIsAuthReady(true);
          } else {
            // User is signed out, try to sign in
            try {
              const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
              if (token) {
                await signInWithCustomToken(authInstance, token);
              } else {
                await signInAnonymously(authInstance);
              }
            } catch (authError) {
              console.error('Anonymous sign-in failed:', authError);
              setError('Failed to authenticate with the service.');
              setIsAuthReady(true); // Still ready, but with an error
            }
          }
        });
        return () => unsubscribe();
      } else {
        setError('Firebase config is missing.');
        setIsAuthReady(true);
      }
    } catch (e) {
      console.error('Error initializing Firebase:', e);
      setError('Could not initialize application.');
      setIsAuthReady(true);
    }
  }, []);
  
  // --- Login Handler ---
  const handleLogin = useCallback(async (email, password) => {
    setError(null);
    
    // 1. Check for Owner
    // (PROTOTYPE ONLY - NOT SECURE)
    if (email === OWNER_EMAIL && password === OWNER_PASSWORD) {
      setUserRole('owner');
      setCurrentUser({ name: 'Owner', email: OWNER_EMAIL });
      return;
    }
    
    // 2. Check for Worker
    // (PROTOTYPE ONLY - NOT SECURE, checks plain text password)
    try {
        const workersRef = collection(db, getPublicCollectionPath('workers'));
        const q = query(workersRef, where("email", "==", email), where("password", "==", password));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            setError('Invalid email or password.');
        } else {
            const workerDoc = querySnapshot.docs[0];
            setUserRole('worker');
            setCurrentUser({ id: workerDoc.id, ...workerDoc.data() });
        }
    } catch (err) {
        console.error("Error logging in worker: ", err);
        setError('An error occurred during login. Please try again.');
    }
  }, [db]);


  // --- Logout Handler ---
  const handleLogout = () => {
    setUserRole(null);
    setCurrentUser(null);
    setError(null);
  };
  
  // --- Render Logic ---
  if (!isAuthReady || !db || !auth) {
    return <LoadingSpinner />;
  }
  
  if (error && !userRole) {
      // Show critical error if auth failed before login
      if (!userId) return <div className="p-4 text-red-700 bg-red-100 min-h-screen flex items-center justify-center">{error}</div>
  }


  if (!userRole) {
    return <LoginScreen onLogin={handleLogin} error={error} />;
  }
  
  if (userRole === 'owner') {
      return <OwnerPanel db={db} userId={userId} onLogout={handleLogout} />
  }


  if (userRole === 'worker') {
      return <WorkerPanel db={db} userId={userId} worker={currentUser} onLogout={handleLogout} />
  }


  return <div>Something went wrong.</div>;
}


export default App;