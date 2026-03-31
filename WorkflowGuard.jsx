import { useEffect, useState } from "react";
import useWorkflow from "../hooks/useWorkflow";
import Loader from "./Loader";

const WorkflowGuard = ({ step, children }) => {
    const workflow = useWorkflow();
    const [allowed, setAllowed] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const isAllowed = workflow.checkWorkflow(step);
        setAllowed(isAllowed);
        setChecking(false);
    }, [step, workflow.currentStep]); // Re-run if prop step OR global currentStep changes

    if (checking) return <Loader />;

    return allowed ? children : null; // checkWorkflow handles the redirect via toast/navigation logic
};

export default WorkflowGuard;
