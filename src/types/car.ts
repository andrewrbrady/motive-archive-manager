// types/car.ts
interface Engine {
  type: string;
  displacement: string;
  power_output: string;
  torque: string;
  features: string[];
}

interface Car {
  _id: string;
  brand: string;
  model: string;
  year: string | number;
  price: string;
  mileage: string | number;
  color: string | number;
  engine: Engine;
  horsepower: number | null;
  condition: 'New' | 'Used' | '';
  location: string;
  description: string;
  images: string[];
  history_report: string;
  owner_id: string;
  documents: string[];
  client: string;
}

interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  documents: string[];
  cars: string[];
}