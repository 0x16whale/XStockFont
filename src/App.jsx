import { useState, useCallback } from "react";
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
  
  // Refresh key to trigger data reload
  const [refreshKey, setRefreshKey] = useState(0);

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
    // Refresh data after successful creation
    triggerRefresh();
  };

  // Handle network switch - refresh all data
  const handleNetworkSwitch = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    // Also refresh selected stock if on detail page
    if (selectedStock) {
      setSelectedStock(prev => ({ ...prev, _refresh: Date.now() }));
    }
  }, [selectedStock]);

  // Global refresh function that can be passed to child components
  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="app">
      <Header 
        currentPage={currentPage} 
        onNavigate={handleNavigate} 
        onNetworkSwitch={handleNetworkSwitch}
      />
      
      <main className="main-content">
        <div className="container">
          {currentPage === "home" && (
            <StockList 
              key={refreshKey}
              onSelectStock={handleSelectStock} 
              onCreateStock={handleCreateStock}
            />
          )}
          
          {currentPage === "detail" && selectedStock && (
            <StockDetail 
              key={`${selectedStock.id}-${refreshKey}`}
              stock={selectedStock} 
              onBack={() => handleNavigate("home")}
              onTransactionSuccess={triggerRefresh}
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
