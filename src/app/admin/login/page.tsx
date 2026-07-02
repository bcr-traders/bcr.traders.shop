import { SignIn } from '@clerk/nextjs'

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#E5E5E5] p-4 font-sans">
      <div className="w-full max-w-md bg-white border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
        <div className="mb-8 text-center border-b-4 border-black pb-6">
          <h1 className="text-3xl font-black uppercase tracking-tight text-black">
            Admin Portal.
          </h1>
          <p className="font-bold text-xs uppercase tracking-widest mt-2 text-black/60">
            BCR Traders Management
          </p>
        </div>
        <div className="flex justify-center">
           <SignIn 
            fallbackRedirectUrl="/admin/dashboard" 
            signUpUrl={false as never} 
            appearance={{
              elements: {
                card: "bg-transparent shadow-none border-0 p-0 w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                formButtonPrimary: "bg-black hover:bg-black/80 text-white rounded-none border-2 border-black font-bold uppercase tracking-widest text-xs py-3 transition-colors",
                formFieldInput: "bg-white border-2 border-black rounded-none font-bold text-sm px-4 py-3 focus:ring-0 focus:border-black text-black",
                formFieldLabel: "font-black uppercase text-[10px] tracking-widest text-black mb-1.5",
                footerAction: "hidden",
                dividerLine: "bg-black/20",
                dividerText: "font-black uppercase text-[10px] tracking-widest text-black/60 bg-white px-2",
                socialButtonsBlockButton: "bg-white border-2 border-black rounded-none hover:bg-gray-50 transition-colors font-bold text-xs text-black py-3",
              }
            }}
          />
        </div>
      </div>
    </main>
  )
}