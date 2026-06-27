  import User from "../Database/models/User-Models/user.models.js";
  
  const ensureAdminAccount = async () => {
	
    const adminEmail = process.env.ADMIN_EMAIL || "software.2040@pgel.in";

	const existingAdmin = await User.findOne({ email: adminEmail });
	if (existingAdmin) {
		if (existingAdmin.role !== "hod") {
			existingAdmin.role = "hod";
			await existingAdmin.save();
		}
		console.log(`HOD account ready: ${adminEmail}`);
		return;
	}

	await User.create({
		email: adminEmail,
		role: "hod",
		status: "active",
		otpExpiresAt: new Date(0),
		isBlocked: false,
		isSystemRole: true,
	});

	console.log(`HOD account created: ${adminEmail}`);
};




export default ensureAdminAccount;


