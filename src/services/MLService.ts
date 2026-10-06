/**
 * Machine Learning Service
 * Connects frontend to backend ML models for predictions and analytics
 */

const ML_API_BASE = 'http://127.0.0.1:8000/api/ml';

export interface SaleData {
  id: string;
  timestamp: string;
  total: number;
  units: number;
  medicineName: string;
  customerId?: string;
}

export interface MLPredictionResponse {
  status: string;
  predictions: Record<string, number>;
  trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  training_samples: number;
  model_confidence: number;
  generated_at: string;
}

export interface DemandAnalysis {
  status: string;
  patterns: {
    medicine_demand: Record<string, number>;
    day_demand: Record<string, number>;
    top_medicines: [string, number][];
  };
  recommendations: Array<{
    medicine: string;
    daily_avg: number;
    weekly_avg: number;
    suggested_reorder: number;
    risk_level: string;
  }>;
  analysis_date: string;
}

export interface AnomalyResult {
  status: string;
  anomalies: Array<{
    transaction_id: string;
    amount: number;
    z_score: number;
    severity: 'high' | 'medium';
    timestamp: string;
  }>;
  normal_transactions: number;
  anomaly_rate: number;
  statistics: {
    mean_sale: number;
    std_dev: number;
  };
  analysis_date: string;
}

export interface RevenueMetrics {
  status: string;
  total_revenue: number;
  total_units: number;
  avg_price_per_unit: number;
  high_value_items: Array<{
    medicine: string;
    avg_price: number;
    units_sold: number;
    revenue: number;
  }>;
  volume_items: Array<{
    medicine: string;
    units_sold: number;
    revenue: number;
    transactions: number;
  }>;
  analysis_date: string;
}

class MLService {
  /**
   * Check ML service health
   */
  static async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${ML_API_BASE}/health`);
      return response.json();
    } catch (error) {
      console.error('ML Service health check failed:', error);
      return null;
    }
  }

  /**
   * Get ML service statistics
   */
  static async getStats(): Promise<any> {
    try {
      const response = await fetch(`${ML_API_BASE}/stats`);
      return response.json();
    } catch (error) {
      console.error('Failed to fetch ML stats:', error);
      return null;
    }
  }

  /**
   * Predict future sales
   */
  static async predictSales(
    salesData: SaleData[],
    daysAhead: number = 7
  ): Promise<MLPredictionResponse> {
    try {
      const response = await fetch(`${ML_API_BASE}/predict/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales_data: salesData,
          days_ahead: daysAhead,
        }),
      });

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Sales prediction error:', error);
      throw error;
    }
  }

  /**
   * Analyze medicine demand patterns
   */
  static async analyzeDemand(salesData: SaleData[]): Promise<DemandAnalysis> {
    try {
      const response = await fetch(`${ML_API_BASE}/analyze/demand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales_data: salesData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Demand analysis failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Demand analysis error:', error);
      throw error;
    }
  }

  /**
   * Detect anomalous transactions
   */
  static async detectAnomalies(salesData: SaleData[]): Promise<AnomalyResult> {
    try {
      const response = await fetch(`${ML_API_BASE}/detect/anomalies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales_data: salesData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Anomaly detection failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Anomaly detection error:', error);
      throw error;
    }
  }

  /**
   * Optimize revenue
   */
  static async optimizeRevenue(salesData: SaleData[]): Promise<RevenueMetrics> {
    try {
      const response = await fetch(`${ML_API_BASE}/optimize/revenue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales_data: salesData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Revenue optimization failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Revenue optimization error:', error);
      throw error;
    }
  }

  /**
   * Train all models with data
   */
  static async trainModels(salesData: SaleData[]): Promise<any> {
    try {
      const response = await fetch(`${ML_API_BASE}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales_data: salesData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Model training failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Model training error:', error);
      throw error;
    }
  }
}

export default MLService;
