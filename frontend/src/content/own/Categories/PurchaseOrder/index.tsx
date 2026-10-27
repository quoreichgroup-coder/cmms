import CategoriesLayout from '../CategoriesLayout';
import useAuth from '../../../../hooks/useAuth';
import { PlanFeature } from '../../../../models/owns/subscriptionPlan';
import FeatureErrorMessage from '../../components/FeatureErrorMessage';

function PurchaseOrderCategories() {
  const { hasFeature } = useAuth();
  if (!hasFeature(PlanFeature.PURCHASE_ORDER)) {
    return <FeatureErrorMessage message="upgrade_po" />;
  }
  return <CategoriesLayout tabIndex={6} basePath="purchase-order-categories" />;
}

export default PurchaseOrderCategories;
