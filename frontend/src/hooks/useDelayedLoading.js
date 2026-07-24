import { useEffect, useState } from "react";

function useDelayedLoading(loading, delay = 250) {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let timer;

    if (loading) {
      timer = setTimeout(() => {
        setShowLoader(true);
      }, delay);
    } else {
      setShowLoader(false);
    }

    return () => clearTimeout(timer);
  }, [loading, delay]);

  return loading ? showLoader : true;
}

export default useDelayedLoading;
