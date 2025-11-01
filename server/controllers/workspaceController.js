//get all workspace for user
export const getUserWorkspaces = async (req, res) => {
  try {
    const {userId} = await req.auth();
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: userId
          }
        }
      },
        include: {
          members: { include: { user: true } },
          projects:{
            include:{
                tasks:{include: {assignee: true, comments:{include:{user:true}}}},
                members:{include:{user:true}}
            }
          },
          owner: true
        }
    });
    res.json(workspaces);
  } catch (error) {
    console.error("Error fetching user workspaces:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//add member to workspace
export const addMember = async (req, res) => {
    try{
         const {userId} = await req.auth();
            const { workspaceId, email, role,message } = req.body;

            // Check if user exists
            const user =  await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return  res.status(404).json({ message: "User not found" });
            }

            if(!workspaceId || !role){
                return res.status(400).json({ message: "Missing required parameters" })
            }

            if(!['ADMIN','MEMBER'].includes(role)){
                return res.status(400).json({ message: "Invalid role" })
            }

            //fetch workspace
            const workspace = await prisma.workspace.findUnique({
                where:{ id: workspaceId },
                include:{ members:true }
            })
            if(!workspace){
                return res.status(404).json({ message: "Workspace not found" });
            }
            //check if creator has admin role
            if (!workspace.members.find(member => member.userId === userId && member.role === 'ADMIN')) {
                return res.status(401).json({ message: "You do not have Admin permissions" });
            }

            //check if user is already a member
            const existingMember = workspace.members.find(member => member.userId === user.id);
            if(existingMember){
                return res.status(400).json({ message: "User is already a member of the workspace" });
            }

            const member = await prisma.workspaceMember.create({
                data:{
                    userId: user.id,
                    workspaceId,
                    role,
                    message
                }
            });
            res.json({ message: "member added successfully" });

    }catch(error){
      console.log(error);
      res.status(500).json({ message: error.code || error.message });  
    }
}