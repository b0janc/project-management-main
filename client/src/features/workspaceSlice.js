import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../configs/api";

// ------------------------------------------------------------------
// 1. DEFINISIKAN ASYNC THUNK DI SINI (PALING ATAS - SANGAT PENTING)
// ------------------------------------------------------------------

export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchWorkspaces',
  async ({ getToken }, { rejectWithValue }) => {
    try {
      // Mengambil token untuk autentikasi
      const token = await getToken();
      // Request ke Backend
      const { data } = await api.get('/api/workspaces', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Kembalikan data (Array)
      return data.workspaces || data || []; 
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const fetchWorkspaceMembers = createAsyncThunk(
  'workspace/fetchWorkspaceMembers',
  async ({ workspaceId, getToken }, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const { data } = await api.get(`/api/workspaces/${workspaceId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { workspaceId, members: data.members || [] }; 
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ------------------------------------------------------------------
// 2. INITIAL STATE
// ------------------------------------------------------------------

const initialState = {
  workspaces: [],
  currentWorkspace: null,
  status: 'idle',
  loading: false,
  error: null,
};

// ------------------------------------------------------------------
// 3. CREATE SLICE (BARU DIBUAT SETELAH THUNK DIATAS ADA)
// ------------------------------------------------------------------

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setWorkspaces: (state, action) => {
      state.workspaces = Array.isArray(action.payload) ? action.payload : [];
    },
    setCurrentWorkspace: (state, action) => {
      const workspaceId = action.payload;
      localStorage.setItem("currentWorkspaceId", workspaceId);
      
      const found = state.workspaces.find((w) => w.id === workspaceId);
      if (found) state.currentWorkspace = found;
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
    updateTask: (state, action) => {
        const updatedTask = action.payload;
        const workspace = state.workspaces.find(w => w.id === state.currentWorkspace?.id);
        if (workspace) {
            const project = workspace.projects.find((p) => p.id === updatedTask.projectId);
            if (project) {
                const index = project.tasks.findIndex((t) => t.id === updatedTask.id);
                if (index !== -1) {
                    project.tasks[index] = updatedTask;
                    state.currentWorkspace = workspace;
                }
            }
        }
    },
    deleteTask: (state, action) => {
        const { projectId, taskIds } = action.payload;
        const workspace = state.workspaces.find(w => w.id === state.currentWorkspace?.id);
        if (workspace) {
            const project = workspace.projects.find((p) => p.id === projectId);
            if (project) {
                project.tasks = project.tasks.filter((t) => !taskIds.includes(t.id));
                state.currentWorkspace = workspace;
            }
        }
    },
    resetWorkspace: (state) => {
        state.workspaces = [];
        state.currentWorkspace = null;
        state.status = 'idle';
        localStorage.removeItem("currentWorkspaceId");
    }
  },
  
  // EXTRA REDUCERS (Tempat Thunk digunakan)
  extraReducers: (builder) => {
    // Di sini 'fetchWorkspaces' dipanggil. Jika fetchWorkspaces didefinisikan di bawah, ini akan ERROR.
    builder.addCase(fetchWorkspaces.pending, (state) => {
      state.loading = true;
      state.status = 'loading';
    });

    builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
      let data = action.payload;
      if (!Array.isArray(data)) data = data.workspaces || data.data || [];
      
      state.workspaces = data;
      state.loading = false;
      state.status = 'succeeded';

      // Auto-Select Workspace Logic
      if (data.length > 0) {
        const savedId = localStorage.getItem('currentWorkspaceId');
        const savedWorkspace = data.find((w) => w.id === savedId);
        if (savedWorkspace) {
          state.currentWorkspace = savedWorkspace;
        } else {
          state.currentWorkspace = data[0];
          localStorage.setItem('currentWorkspaceId', data[0].id);
        }
      } else {
        state.currentWorkspace = null;
      }
    });

    builder.addCase(fetchWorkspaces.rejected, (state, action) => {
      state.loading = false;
      state.status = 'failed';
      state.workspaces = []; 
    });

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

export const { 
  setWorkspaces, setCurrentWorkspace, addWorkspace, 
  addProject, addTask, updateTask, deleteTask, resetWorkspace 
} = workspaceSlice.actions;

export default workspaceSlice.reducer;