import { useState } from "react";
import { XIcon, CalendarIcon, UsersIcon } from "lucide-react"; // Saya tambahkan icon pelengkap (opsional, jika tidak ada bisa dihapus di JSX)
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import api from "../configs/api";
import { useAuth } from "@clerk/clerk-react";
import { addProject } from "../features/workspaceSlice";

const CreateProjectDialog = ({ isDialogOpen, setIsDialogOpen }) => {
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  
  const { currentWorkspace } = useSelector((state) => state.workspace);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "PLANNING",
    priority: "MEDIUM",
    start_date: "",
    end_date: "",
    team_members: [],
    team_lead: "",
    progress: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  console.log("CEK ACTION:", addProject);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.team_lead) {
        return toast.error("Please select a team lead");
      }
      setIsSubmitting(true);
      const { data } = await api.post(
        "/api/projects",
        { workspaceId: currentWorkspace.id, ...formData },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );
      dispatch(addProject(data.project));
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeTeamMember = (email) => {
    setFormData((prev) => ({
      ...prev,
      team_members: prev.team_members.filter((m) => m !== email),
    }));
  };

  if (!isDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
      {/* Container Utama dengan Max Height agar responsive di layar kecil */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Create New Project</h2>
            {currentWorkspace && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Workspace:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                  {currentWorkspace.name}
                </span>
              </div>
            )}
          </div>
          <button
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
            onClick={() => setIsDialogOpen(false)}
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* --- SCROLLABLE FORM BODY --- */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="create-project-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Project Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Website Redesign Q1"
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Briefly describe the project goals..."
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[100px] resize-none"
              />
            </div>

            {/* Grid: Status & Priority */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Status</label>
                <div className="relative">
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  {/* Custom Arrow Indicator could go here, keeping simple for no-func-change */}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            {/* Grid: Dates */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">End Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date && new Date(formData.start_date).toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2"></div>

            {/* Lead */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Project Lead <span className="text-red-500">*</span></label>
              <select
                value={formData.team_lead}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    team_lead: e.target.value,
                    team_members: e.target.value
                      ? [...new Set([...formData.team_members, e.target.value])]
                      : formData.team_members,
                  })
                }
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
              >
                <option value="">Select a leader...</option>
                {currentWorkspace?.members?.map((member) => (
                  <option key={member.id} value={member?.user?.email}>
                    {member?.user?.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Members */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Team Members</label>
              <select
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer mb-3"
                value="" 
                onChange={(e) => {
                  if (
                    e.target.value &&
                    !formData.team_members.includes(e.target.value)
                  ) {
                    setFormData((prev) => ({
                      ...prev,
                      team_members: [...prev.team_members, e.target.value],
                    }));
                  }
                }}
              >
                <option value="">+ Add team member</option>
                {currentWorkspace?.members
                  ?.filter(
                    (member) =>
                      member?.user && !formData.team_members.includes(member.user.email)
                  )
                  .map((member) => (
                    <option key={member.id} value={member.user.email}>
                      {member.user.email}
                    </option>
                  ))}
              </select>

              {/* Display selected team members as Chips */}
              <div className="flex flex-wrap gap-2">
                {formData.team_members.length === 0 && (
                  <p className="text-xs text-zinc-400 italic">No members selected yet.</p>
                )}
                {formData.team_members.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 transition-colors"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeTeamMember(email)}
                      className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
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
            form="create-project-form" // Mengaitkan tombol external ini ke form ID
            disabled={isSubmitting || !currentWorkspace}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              "Create Project"
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateProjectDialog;