import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, Coins } from "lucide-react";
import { Service } from "@shared/schema";

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card 
      className="service-dropdown overflow-hidden transition-all duration-300 hover:shadow-lg group border-l-4 border-l-primary"
      data-testid={`service-card-${service.category}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
              {service.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {service.name}
                </CardTitle>
                <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                  {service.category}
                </Badge>
              </div>
              <CardDescription className="text-sm line-clamp-2">
                {service.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {service.isActive ? (
              <Badge variant="default" className="bg-green-600 text-white">
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                Inactive
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Options summary when collapsed */}
        {!isExpanded && service.options && service.options.length > 0 && (
          <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="font-medium">{service.options.length} Service Options Available</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="h-8 text-primary hover:text-primary hover:bg-primary/10"
              data-testid={`button-expand-${service.category}`}
            >
              View Options
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Expanded options list */}
        {isExpanded && service.options && service.options.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">Service Options</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-6 text-xs"
                data-testid={`button-collapse-${service.category}`}
              >
                Hide Options
                <ChevronUp className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {service.options.map((option) => (
                <div
                  key={option.id}
                  className="bg-muted/30 rounded-lg p-3 border border-border hover:border-primary/50 hover:bg-muted/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground mb-1">
                        {option.name}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {option.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {option.price && (
                        <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded">
                          <Coins className="h-3 w-3" />
                          <span className="text-sm font-bold">
                            {option.price}
                          </span>
                        </div>
                      )}
                      {option.duration && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{option.duration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No options message */}
        {(!service.options || service.options.length === 0) && (
          <div className="text-center text-sm text-muted-foreground py-2 bg-muted/30 rounded-lg">
            Contact us for custom pricing on this service
          </div>
        )}
      </CardContent>
    </Card>
  );
}
