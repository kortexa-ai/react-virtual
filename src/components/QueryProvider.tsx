import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
            },
        },

    });

    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}