import CompanySettings from './companySettings';
import OwnSubscription from './ownSubscription';
import File from './file';

export interface Company {
  id: string;
  logo: File;
  name: string;
  address: string;
  website: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  subscription: OwnSubscription;
  companySettings: CompanySettings;
}
