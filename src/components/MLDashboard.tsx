import React, { useState, useEffect, useCallback } from 'react';
import MLService, {
  SaleData,
  MLPredictionResponse,
  DemandAnalysis,
  AnomalyResult,
  RevenueMetrics
} from '../services/MLService';
import { ProductSaleEntry } from '../types';

type Props = {
  salesData?: ProductSaleEntry[];
};

export default function MLDashboard({ salesData = [] }: Props) {
  const [predictions, setPredictions] =
    useState<MLPredictionResponse | null>(null);

  const [demandAnalysis, setDemandAnalysis] =
    useState<DemandAnalysis | null>(null);

  const [anomalies, setAnomalies] =
    useState<AnomalyResult | null>(null);

  const [revenue, setRevenue] =
    useState<RevenueMetrics | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [selectedTab, setSelectedTab] = useState<
    'predictions' | 'demand' | 'anomalies' | 'revenue'
  >('predictions');

  // MODAL
  const [showDemandModal, setShowDemandModal] = useState(false);

  // Convert ProductSaleEntry to SaleData format
  const convertToSaleData = (
    sales: ProductSaleEntry[]
  ): SaleData[] => {
    return sales.map((s, idx) => ({
      id: s.id,
      timestamp: s.timestamp,
      total: s.total,
      units: s.units,
      medicineName: `Medicine ${idx + 1}`,
      customerId: undefined
    }));
  };

  // Fetch ML Insights
  const fetchMLInsights = useCallback(async () => {
    if (salesData.length === 0) {
      setPredictions(null);
      setDemandAnalysis(null);
      setAnomalies(null);
      setRevenue(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const saleData = convertToSaleData(salesData);

      const [
        predResult,
        demandResult,
        anomalyResult,
        revenueResult
      ] = await Promise.all([
        MLService.predictSales(saleData, 7).catch(err => ({
          status: 'error',
          message: err.message
        })),

        MLService.analyzeDemand(saleData).catch(err => ({
          status: 'error',
          message: err.message
        })),

        MLService.detectAnomalies(saleData).catch(err => ({
          status: 'error',
          message: err.message
        })),

        MLService.optimizeRevenue(saleData).catch(err => ({
          status: 'error',
          message: err.message
        }))
      ]);

      setPredictions(predResult as any);
      setDemandAnalysis(demandResult as any);
      setAnomalies(anomalyResult as any);
      setRevenue(revenueResult as any);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch ML insights'
      );

      console.error(err);

    } finally {
      setLoading(false);
    }
  }, [salesData]);

  useEffect(() => {
    fetchMLInsights();
  }, [fetchMLInsights]);

  // EMPTY
  if (salesData.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-800 font-semibold mb-2">
          Machine Learning Analytics
        </p>

        <p className="text-blue-600">
          Add sales transactions to see ML insights
        </p>
      </div>
    );
  }

  return (
    <>
      {/* MAIN */}
      <div className="space-y-6 min-h-screen relative">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">
            Machine Learning Analytics
          </h2>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDemandModal(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition"
            >
              Open Demand Modal
            </button>

            <button
              onClick={fetchMLInsights}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Analyzing...' : 'Refresh Analysis'}
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">
              Analysis Error
            </p>

            <p className="text-red-600 text-sm">
              {error}
            </p>
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-2 border-b border-gray-200">
          {(
            ['predictions', 'demand', 'anomalies', 'revenue'] as const
          ).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-3 font-medium transition ${selectedTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="bg-white rounded-xl shadow-md p-6">

          {/* LOADING */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* PREDICTIONS */}
          {!loading &&
            selectedTab === 'predictions' &&
            predictions && (
              <div className="space-y-4">

                <h3 className="text-2xl font-bold text-gray-800">
                  Sales Predictions
                </h3>

                <div className="grid grid-cols-3 gap-4">

                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">
                      Trend
                    </p>

                    <p className="text-2xl font-bold text-blue-600 capitalize">
                      {predictions.trend}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">
                      Confidence
                    </p>

                    <p className="text-2xl font-bold text-green-600">
                      {(predictions.model_confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">
                      Samples
                    </p>

                    <p className="text-2xl font-bold text-purple-600">
                      {predictions.training_samples}
                    </p>
                  </div>

                </div>
              </div>
            )}

          {/* DEMAND */}
          {!loading &&
            selectedTab === 'demand' &&
            demandAnalysis && (
              <div className="space-y-4">

                <h3 className="text-2xl font-bold text-gray-800">
                  Demand Analysis
                </h3>

                {demandAnalysis.recommendations.map(rec => (
                  <div
                    key={rec.medicine}
                    className="border rounded-xl p-4"
                  >
                    <div className="flex justify-between items-center">

                      <div>
                        <h4 className="font-bold text-lg text-gray-800">
                          {rec.medicine}
                        </h4>

                        <p className="text-sm text-gray-500">
                          Daily Avg: {rec.daily_avg}
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${rec.risk_level === 'high'
                          ? 'bg-red-100 text-red-700'
                          : rec.risk_level === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                          }`}
                      >
                        {rec.risk_level.toUpperCase()}
                      </span>

                    </div>
                  </div>
                ))}

              </div>
            )}
        </div>
      </div>

      {/* FULLSCREEN MODAL */}
      {showDemandModal && demandAnalysis && (
        <div
          className="fixed z-[100]"
          style={{
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            padding: '24px',
            overflowY: 'auto',
            position: 'fixed'
          }}
        >
          <div className="min-h-full flex items-center justify-center">

            {/* MODAL CARD */}
            <div className="relative w-full z-[100] max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">

              {/* CLOSE */}
              <button
                onClick={() => setShowDemandModal(false)}
                className="absolute right-4 top-4 text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>

              {/* TITLE */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900">
                  High-Demand Medicines
                </h2>

                <p className="text-gray-500 mt-1">
                  ML-detected demand patterns
                </p>
              </div>

              {/* CONTENT */}
              <div className="space-y-4">

                {demandAnalysis.recommendations.map(rec => (
                  <div
                    key={rec.medicine}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                  >
                    <div className="flex justify-between items-start mb-4">

                      <h3 className="text-xl font-bold text-gray-800">
                        {rec.medicine}
                      </h3>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${rec.risk_level === 'high'
                          ? 'bg-red-100 text-red-700'
                          : rec.risk_level === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                          }`}
                      >
                        {rec.risk_level.toUpperCase()} RISK
                      </span>

                    </div>

                    <div className="grid grid-cols-2 gap-4">

                      <div>
                        <p className="text-sm text-gray-500 font-semibold">
                          DAILY AVERAGE
                        </p>

                        <p className="text-2xl font-bold text-gray-800">
                          {rec.daily_avg} units
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 font-semibold">
                          SUGGESTED REORDER
                        </p>

                        <p className="text-2xl font-bold text-blue-600">
                          {rec.suggested_reorder} units
                        </p>
                      </div>

                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
