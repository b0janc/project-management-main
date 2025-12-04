import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useUser, SignIn, useAuth, CreateOrganization, useOrganizationList } from '@clerk/clerk-react'
import { Loader2Icon, RefreshCcw } from 'lucide-react'

// COMPONENTS
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'

// REDUX ACTIONS (Pastikan path impor ini benar!)
import { loadTheme } from '../features/themeSlice'
// Import action fetchWorkspaces. Jika ini undefined, aplikasi crash.
import { fetchWorkspaces, fetchWorkspaceMembers } from '../features/workspaceSlice'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    
    // Ambil state dari Redux
    const { 
        workspaces, 
        currentWorkspace, 
        loading: reduxLoading, 
        status 
    } = useSelector((state) => state.workspace)
    
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()

    // Cek daftar organisasi langsung dari Clerk (untuk sinkronisasi)
    const { userMemberships, isLoaded: isOrgListLoaded } = useOrganizationList({
        userMemberships: { infinite: true },
    });

    // 1. Load Theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    // 2. TRIGGER FETCHING WORKSPACES (Perbaikan Utama)
    useEffect(() => {
        // Cek apakah 'fetchWorkspaces' terimport dengan benar
        if (!fetchWorkspaces) {
            console.error("CRITICAL ERROR: fetchWorkspaces is undefined. Check workspaceSlice.js exports!");
            return;
        }

        // Jalankan fetch jika:
        // - Auth sudah siap (isLoaded)
        // - User sudah login
        // - Status Redux masih 'idle' (belum pernah fetch)
        if (isLoaded && user && status === 'idle') {
            console.log("🚀 Layout: Memicu fetchWorkspaces...");
            dispatch(fetchWorkspaces({ getToken }))
        }
    }, [user, isLoaded, status, dispatch, getToken])

    // 3. Trigger Fetch Members saat workspace aktif berubah
    useEffect(() => {
        if (currentWorkspace?.id) {
            dispatch(fetchWorkspaceMembers({ 
                workspaceId: currentWorkspace.id, 
                getToken 
            }));
        }
    }, [currentWorkspace?.id, dispatch, getToken]);

    // --- TAMPILAN (RENDER LOGIC) ---

    // A. Tunggu Loading Auth
    if (!isLoaded || !isOrgListLoaded) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    // B. Redirect jika belum login
    if (!user) {
        return (
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'>
                <SignIn />
            </div>
        )
    }

    // C. Cek Sinkronisasi (Clerk Punya Data, tapi Database Kosong)
    const clerkHasOrg = userMemberships.count > 0;
    const dbIsEmpty = workspaces.length === 0;

    // Jika sedang sync atau loading awal dari redux
    if (reduxLoading || (clerkHasOrg && dbIsEmpty && status !== 'failed')) {
        return (
            <div className='flex flex-col items-center justify-center h-screen bg-white dark:bg-zinc-950 gap-4 p-6 text-center'>
                <Loader2Icon className="size-10 text-blue-600 animate-spin" />
                <div>
                    <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
                        Loading your workspace...
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        Syncing data from server.
                    </p>
                </div>
                {/* Tombol darurat jika loading macet */}
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-6 text-sm text-zinc-400 hover:text-zinc-600 underline flex items-center gap-2"
                >
                    <RefreshCcw className="size-3" />
                    Stuck? Reload Page
                </button>
            </div>
        )
    }

    // D. Jika Benar-benar User Baru (Tidak punya organisasi)
    if (workspaces.length === 0 && status === 'succeeded') {
        return (
            <div className='min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-zinc-900 p-4'>
                <CreateOrganization afterCreateOrganizationUrl="/" />
            </div>
        )
    }

    // E. Render Dashboard Utama
    return (
        <div className="flex h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100 overflow-hidden">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-full relative">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <main className="flex-1 p-6 xl:p-10 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default Layout