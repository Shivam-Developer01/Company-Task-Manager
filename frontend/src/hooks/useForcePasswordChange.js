import { useEffect, useState } from "react";

import profileService from "../services/profileService";

function useForcePasswordChange() {
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      setLoading(true);

      const response = await profileService.getProfile();

      setMustChangePassword(response.data.mustChangePassword);

      const storedUser = JSON.parse(localStorage.getItem("user"));

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          ...response.data,
        }),
      );
    } catch (error) {
      console.error("Unable to load profile", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return {
    loading,
    mustChangePassword,
    refreshProfile,
  };
}

export default useForcePasswordChange;
