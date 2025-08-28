import {QueryProvider} from "./components/QueryProvider"
import {MainContent} from "./components/MainContent"

export function App() {
  return (
    <QueryProvider>
      <MainContent />
    </QueryProvider>
  )
}
