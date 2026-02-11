import { useState } from "react";
import { useAccount } from "wagmi";
import Header from "./components/Header";
import StockList from "./components/StockList";
import CreateStockModal from "./components/CreateStockModal";
import StatusModal from "./components/StatusModal";
import StockDetail from "./pages/StockDetail";

function App() {
  const { isConnected } = useAccount();
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedStock, setSelectedStock] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [createdStockId, setCreatedStockId] = useState(null);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    if (page === "home") {
      setSelectedStock(null);
    }
  };

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setCurrentPage("detail");
  };

  const handleCreateStock = () => {
    if (!isConnected) {
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setCreatedStockId(1);
    setIsStatusModalOpen(true);
  };

  return (
    <div className="app">
      <Header currentPage={currentPage} onNavigate={handleNavigate} />
      
      <main className="main-content">
        <div className="container">
          {currentPage === "home" && (
            <StockList 
              onSelectStock={handleSelectStock} 
              onCreateStock={handleCreateStock}
            />
          )}
          
          {currentPage === "detail" && selectedStock && (
            <StockDetail 
              stock={selectedStock} 
              onBack={() => handleNavigate("home")}
            />
          )}
        </div>
      </main>

      <CreateStockModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <StatusModal
        stockId={createdStockId}
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />
    </div>
  );
}

export default App;
