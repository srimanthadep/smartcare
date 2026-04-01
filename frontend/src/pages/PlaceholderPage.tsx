import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">{title}</h1>
      <Card className="border-border/50">
        <CardContent className="p-12 text-center text-muted-foreground">
          <Construction className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="font-heading font-medium text-lg">{title}</p>
          <p className="text-sm mt-1">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PlaceholderPage;
