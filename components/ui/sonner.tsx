import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        style: {
          background: 'rgb(24 24 27)', // zinc-900
          border: '1px solid rgb(39 39 42)', // zinc-800
          color: 'rgb(250 250 250)', // zinc-50
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
