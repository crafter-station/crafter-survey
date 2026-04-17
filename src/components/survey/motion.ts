import type { Variants } from "framer-motion";

export const surveyEase = [0.23, 1, 0.32, 1] as const;

export function getSectionVariants(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      initial: { opacity: 1, transform: "translateY(0px) scale(1)" },
      animate: { opacity: 1, transform: "translateY(0px) scale(1)" },
      exit: { opacity: 1, transform: "translateY(0px) scale(1)" },
    };
  }

  return {
    initial: (direction: number) => ({
      opacity: 0,
      filter: "blur(10px)",
      transform:
        direction >= 0
          ? "translateY(20px) scale(0.985)"
          : "translateY(-20px) scale(0.985)",
    }),
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      transform: "translateY(0px) scale(1)",
      transition: {
        duration: 0.26,
        ease: surveyEase,
      },
    },
    exit: (direction: number) => ({
      opacity: 0,
      filter: "blur(8px)",
      transform:
        direction >= 0
          ? "translateY(-14px) scale(0.992)"
          : "translateY(14px) scale(0.992)",
      transition: {
        duration: 0.2,
        ease: surveyEase,
      },
    }),
  };
}
