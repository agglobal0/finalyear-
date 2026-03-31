import { useRecoilState } from "recoil";
import { workflowAtom } from "../recoil/workflowAtom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const useWorkflow = () => {
    const [workflow, setWorkflow] = useRecoilState(workflowAtom);
    const navigate = useNavigate();

    const steps = ["login", "interview", "method", "analysis", "resume"];

    const updateStep = (step, data = {}) => {
        setWorkflow((prev) => ({
            ...prev,
            ...data,
            currentStep: step
        }));
    };

    const advanceStep = (nextStep) => {
        // Basic validation could be added here
        updateStep(nextStep);
        navigate(`/${nextStep}`);
    };

    const checkWorkflow = (requiredStep) => {
        // This function returns true if the user is allowed to access the route
        const currentIndex = steps.indexOf(workflow.currentStep);
        const requiredIndex = steps.indexOf(requiredStep);

        // Allow backward navigation
        if (requiredIndex < currentIndex) return true;

        // Allow current step
        if (requiredIndex === currentIndex) return true;

        // Block forward jumping
        toast.error("Please complete the previous step first.");
        return false;
    };

    const resetWorkflow = () => {
        setWorkflow({
            resumeId: null,
            interviewId: null,
            interviewCompleted: false,
            methodSelected: false,
            analysisCompleted: false,
            resumeGenerated: false,
            currentStep: "login"
        });
        navigate("/dashboard");
    };

    return {
        ...workflow,
        updateStep,
        advanceStep,
        checkWorkflow,
        resetWorkflow
    };
};

export default useWorkflow;
