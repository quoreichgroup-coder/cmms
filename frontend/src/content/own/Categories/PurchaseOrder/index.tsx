import CategoriesLayout from '../CategoriesLayout';
import useAuth from '../../../../hooks/useAuth';
import { PlanFeature } from '../../../../models/owns/subscriptionPlan';
import FeatureErrorMessage from '../../components/FeatureErrorMessage';

function PurchaseOrderCategories({
  settingsMode = false
}: {
  settingsMode?: boolean;
}) {
  const { hasFeature } = useAuth();
  if (!hasFeature(PlanFeature.PURCHASE_ORDER)) {
    return <FeatureErrorMessage message="upgrade_po" />;
  }
  return (
    <CategoriesLayout
      tabIndex={settingsMode ? 0 : 6}
      basePath="purchase-order-categories"
      navigationBasePath={settingsMode ? '/app/settings' : undefined}
      settingsMode={settingsMode}
    />
  );
}

export default PurchaseOrderCategories;
