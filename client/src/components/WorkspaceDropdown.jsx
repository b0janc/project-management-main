import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useDispatch } from "react-redux"; // Removed useSelector
import { setCurrentWorkspace } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { useClerk, useOrganizationList, useOrganization } from "@clerk/clerk-react"; // Added useOrganization

function WorkspaceDropdown() {

    // 1. Get the list of all organizations (workspaces)
    const { setActive, userMemberships, isLoaded: isOrganizationListLoaded } = useOrganizationList({ userMemberships: true });

    // 2. Get the currently active organization (workspace) details
    const { organization: activeOrganization, isLoaded: isOrganizationLoaded } = useOrganization();

    const { openCreateOrganization } = useClerk();

    // Use the active organization from Clerk as the current workspace for display
    const currentWorkspace = activeOrganization;
    const isLoaded = isOrganizationListLoaded && isOrganizationLoaded; // Combine loading states

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    // The length of the user's memberships list
    const workspaceCount = userMemberships.data?.length || 0;

    const onSelectWorkspace = (organizationId) => {
        // Find the full organization object from the Clerk list
        const selectedMembership = userMemberships.data.find(m => m.organization.id === organizationId);
        const selectedOrganization = selectedMembership?.organization;

        if (selectedOrganization) {
            // 1. Set the active organization in Clerk
            setActive({ organization: organizationId });
            
            // 2. Sync the selected workspace details (ID, name, image_url) to Redux for global app use
            dispatch(setCurrentWorkspace({
                id: selectedOrganization.id,
                name: selectedOrganization.name,
                image_url: selectedOrganization.imageUrl,
                // Add any other properties your Redux state expects from the organization object
            }));

            setIsOpen(false);
            navigate('/');
        }
    }

    // Effect to close dropdown on outside click (No change needed)
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Effect to handle initial sync: Ensure Redux has the initial active Clerk workspace details
    useEffect(() => {
        if (activeOrganization && isLoaded) {
            // Dispatch the initial active organization to Redux if it changes or loads
            dispatch(setCurrentWorkspace({
                id: activeOrganization.id,
                name: activeOrganization.name,
                image_url: activeOrganization.imageUrl,
            }));
        }
    }, [activeOrganization, isLoaded, dispatch]);


    return (
        <div className="relative m-4" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(prev => !prev)} 
                className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                disabled={!isLoaded} // Disable button until data loads
            >
                <div className="flex items-center gap-3">
                    {isLoaded && currentWorkspace ? (
                        <img 
                            src={currentWorkspace.imageUrl} 
                            alt={currentWorkspace.name} 
                            className="w-8 h-8 rounded shadow" 
                        />
                    ) : (
                        // Placeholder for loading state
                        <div className="w-8 h-8 rounded shadow bg-gray-200 dark:bg-zinc-700 animate-pulse" />
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                            {currentWorkspace?.name || (isLoaded ? "Select Workspace" : "Loading...")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {workspaceCount} workspace{workspaceCount !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            </button>

            {isOpen && isLoaded && (
                <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0 mt-1">
                    <div className="p-2 max-h-60 overflow-y-auto">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
                            Workspaces
                        </p>
                        {userMemberships.data.map(({ organization }) => (
                            <div 
                                key={organization.id} 
                                onClick={() => onSelectWorkspace(organization.id)} 
                                className="flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800" 
                            >
                                <img src={organization.imageUrl} alt={organization.name} className="w-6 h-6 rounded" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                        {organization.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                        {/* Note: membersCount is available on the organization object */}
                                        {organization.membersCount || 0} members
                                    </p>
                                </div>
                                {currentWorkspace?.id === organization.id && (
                                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-700" />

                    <div 
                        onClick={() => { openCreateOrganization(); setIsOpen(false); }} 
                        className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800" 
                    >
                        <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300">
                            <Plus className="w-4 h-4" /> Create Workspace
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkspaceDropdown;