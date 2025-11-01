export const protect = async (req, res, next) => {
  try {
    const { userId } = await req.auth();
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = { id: userId };
    next();
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.code || error.message });
  }
};
