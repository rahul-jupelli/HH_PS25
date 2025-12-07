document.addEventListener("DOMContentLoaded", async () => {
    const userInfo = document.getElementById("user-info");
    const token = localStorage.getItem("token");

    if (!token) {
        console.log("No token found — user not logged in.");
        return;
    }

    try {
        // ===== FETCH USER DETAILS =====
        const res = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            console.log("Invalid or expired token.");
            localStorage.removeItem("token");
            return;
        }

        const data = await res.json();
        const user = data.user;

        const name = user?.user_metadata?.name || "No name";
        const email = user?.email || "No email";
        const joinDate = user?.created_at
            ? new Date(user.created_at).toLocaleDateString()
            : "Unknown";

        // Show user profile
        userInfo.innerHTML = `
            <h2>${name}</h2>
            <p>Email: ${email}</p>
            <p>Member Since: ${joinDate}</p>
            <button class="edit-btn" id="editProfileBtn">Edit Profile</button>
        `;

        // ===== OPEN EDIT FORM =====
        document.getElementById("editProfileBtn").addEventListener("click", () => {
            document.getElementById("edit-form").style.display = "block";
            document.getElementById("edit-name").value = name;
            document.getElementById("edit-email").value = email;
        });

        // ===== SAVE PROFILE =====
        document.getElementById("saveProfileBtn").addEventListener("click", async () => {
            const updatedName = document.getElementById("edit-name").value.trim();
            const updatedEmail = document.getElementById("edit-email").value.trim();

            const token = localStorage.getItem("token");

            if (!token) {
                alert("You are not logged in!");
                return;
            }

            try {
                const response = await fetch("/api/updateProfile", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: updatedName,
                        email: updatedEmail
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    alert("Profile updated successfully!");
                    location.reload();
                } else {
                    alert("Update failed: " + result.message);
                }

            } catch (err) {
                console.error("Error updating profile:", err);
                alert("Something went wrong.");
            }
        });

    } catch (err) {
        console.error("Error fetching user profile:", err);
    }
});
