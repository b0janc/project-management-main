import { useState } from "react";
import { XIcon, CalendarIcon, UserIcon, FileTextIcon, ListTodoIcon, AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import api from "../configs/api";
import { useAuth } from "@clerk/clerk-react";
import { addTask } from "../features/workspaceSlice"; // Ensure this import is correct

const CreateTaskDialog = ({ isDialogOpen, setIsDialogOpen, projectId }) => { // Assuming projectId is passed as prop
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  
  const { currentWorkspace } = useSelector((state) => state.workspace);
  
  // Initial state for form data
  const initialState = {
    title: "",
    description: "",
    status: "TO_DO",
    priority: "MEDIUM",
    type: "TASK",
    assigneeId: "", // Use assigneeId directly
    dueDate: "", // Use camelCase to match backend expectation eventually
  };

  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to reset form
  const resetForm = () => setFormData(initialState);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic frontend validation
    if (!formData.title.trim()) {
      return toast.error("Task title is required");
    }

    setIsSubmitting(true);

    try {
      // Prepare payload - sanitize data before sending
      const payload = {
        ...formData,
        workspaceId: currentWorkspace?.id,
        projectId: projectId, // Ensure projectId is available
        // Convert empty string date to null to prevent backend error
        dueDate: formData.dueDate ? formData.dueDate : null,
        // Ensure assigneeId is sent as null if empty string
        assigneeId: formData.assigneeId || null,
      };

      const { data } = await api.post("/api/tasks", payload, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });

      // Dispatch to Redux to update UI immediately
      dispatch(addTask(data.task));
      
      toast.success("Task created successfully!");
      setIsDialogOpen(false);
      resetForm();

    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(error?.response?.data?.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <ListTodoIcon className="size-5 text-blue-600" />
              Create New Task
            </h2>
            {currentWorkspace && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Workspace: <span className="font-medium text-zinc-700 dark:text-zinc-300">{currentWorkspace.name}</span>
              </p>
            )}
          </div>
          <button
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
            onClick={() => setIsDialogOpen(false)}
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* --- FORM BODY --- */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="create-task-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Implement authentication flow"
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
                autoFocus
              />
            </div>

            {/* Grid for Properties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
                >
                  <option value="TO_DO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
                >
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="FEATURE">Feature</option>
                  <option value="IMPROVEMENT">Improvement</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Due Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Assignee Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Assignee</label>
              <div className="relative">
                <select
                  value={formData.assigneeId}
                  onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
                >
                  <option value="">Unassigned</option>
                  {currentWorkspace?.members?.map((member) => (
                    member?.user && (
                      <option key={member.id} value={member.user.id}>
                        {member.user.email} ({member.user.fullName || member.user.username || 'Member'})
                      </option>
                    )
                  ))}
                </select>
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Description</label>
              <div className="relative">
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add detailed description..."
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[120px] resize-none"
                />
                <FileTextIcon className="absolute right-3 top-3 size-4 text-zinc-400 pointer-events-none opacity-50" />
              </div>
            </div>

          </form>
        </div>

        {/* --- FOOTER --- */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setIsDialogOpen(false)}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-task-form"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Task
                <CheckCircle2Icon className="size-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateTaskDialog;