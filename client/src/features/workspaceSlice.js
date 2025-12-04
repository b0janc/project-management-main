import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../configs/api";

// --- A. ASYNC ACTIONS (THUNKS) ---
// WAJIB diletakkan di paling atas (luar createSlice)

export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchWorkspaces',
  async ({ getToken }, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/api/workspaces', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });
      // Mencegah error "find is not a function" dengan memastikan array
      return data.workspaces || data || []; 
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchWorkspaceMembers = createAsyncThunk(
  'workspace/fetchWorkspaceMembers',
  async ({ workspaceId, getToken }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/api/workspaces/${workspaceId}/members`, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });
      return { workspaceId, members: data.members || [] };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// --- B. INITIAL STATE ---
const initialState = {
  workspaces: [],
  currentWorkspace: null,
  status: 'idle',
  loading: false,
  error: null,
};

// --- C. SLICE & REDUCERS ---
const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
    },
    setCurrentWorkspace: (state, action) => {
      const found = state.workspaces.find(w => w.id === action.payload);
      if (found) {
        state.currentWorkspace = found;
        localStorage.setItem("currentWorkspaceId", action.payload);
      }
    },
    addWorkspace: (state, action) => {
      state.workspaces.push(action.payload);
      if (!state.currentWorkspace) {
        state.currentWorkspace = action.payload;
        localStorage.setItem("currentWorkspaceId", action.payload.id);
      }
    },
    addProject: (state, action) => {
      const workspace = state.workspaces.find(w => w.id === state.currentWorkspace?.id);
      if (workspace) {
        if (!Array.isArray(workspace.projects)) workspace.projects = [];
        workspace.projects.push(action.payload);
        state.currentWorkspace = workspace; 
      }
    },
    addTask: (state, action) => {
      const newTask = action.payload;
      const workspace = state.workspaces.find(w => w.id === state.currentWorkspace?.id);
      if (workspace) {
        const project = workspace.projects.find(p => p.id === newTask.projectId);
        if (project) {
           if (!Array.isArray(project.tasks)) project.tasks = [];
           project.tasks.push(newTask);
           state.currentWorkspace = workspace;
        }
      }
    },
    // ... (updateTask, deleteTask, dll logika sama seperti diskusi sebelumnya)
  },
  extraReducers: (builder) => {
    builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
      let data = action.payload;
      if (!Array.isArray(data)) data = data.workspaces || [];
      
      state.workspaces = data;
      state.status = 'succeeded';
      state.loading = false;

      // Auto-Select Logic
      if (data.length > 0) {
        const savedId = localStorage.getItem('currentWorkspaceId');
        const saved = data.find(w => w.id === savedId);
        state.currentWorkspace = saved || data[0];
        localStorage.setItem('currentWorkspaceId', state.currentWorkspace.id);
      } else {
        state.currentWorkspace = null;
      }
    });
    // ... (handle pending & rejected)
    builder.addCase(fetchWorkspaceMembers.fulfilled, (state, action) => {
        const { workspaceId, members } = action.payload;
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (ws) {
            ws.members = members;
            if (state.currentWorkspace?.id === workspaceId) state.currentWorkspace.members = members;
        }
    });
  }
});

// --- D. EXPORTS (WAJIB LENGKAP) ---
export const { 
  setWorkspaces, setCurrentWorkspace, addWorkspace, 
  addProject, addTask, // <-- Pastikan ini ada!
  updateTask, deleteTask 
} = workspaceSlice.actions;

export default workspaceSlice.reducer;