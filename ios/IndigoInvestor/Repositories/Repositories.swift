import Foundation
import CoreData
import Combine

// MARK: - PortfolioRepository

class PortfolioRepository {
    private let coreDataStack: CoreDataStack
    
    init(coreDataStack: CoreDataStack) {
        self.coreDataStack = coreDataStack
    }
    
    func savePortfolio(_ portfolio: Portfolio) {
        let context = coreDataStack.viewContext
        
        // Fetch or create portfolio entity
        let fetchRequest: NSFetchRequest<PortfolioEntity> = PortfolioEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", portfolio.id as CVarArg)
        
        do {
            let results = try context.fetch(fetchRequest)
            let entity = results.first ?? PortfolioEntity(context: context)
            
            // Update entity properties
            entity.id = portfolio.id
            entity.investorId = portfolio.investorId
            // Map Portfolio properties to CoreData entity
            // Portfolio model has computed properties, store basic values
            entity.totalInvested = NSDecimalNumber(decimal: portfolio.totalValue).doubleValue
            entity.currentValue = NSDecimalNumber(decimal: portfolio.totalValue).doubleValue
            entity.lastUpdated = Date()
            
            coreDataStack.save()
        } catch {
            print("Failed to save portfolio: \(error)")
        }
    }
    
    func fetchPortfolio(for investorId: UUID) -> Portfolio? {
        let context = coreDataStack.viewContext
        let fetchRequest: NSFetchRequest<PortfolioEntity> = PortfolioEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "investorId == %@", investorId as CVarArg)
        
        do {
            if let entity = try context.fetch(fetchRequest).first {
                // TODO: Create proper Portfolio from Core Data entity
                // Portfolio model is complex and requires more than just Core Data fields
                return nil
            }
        } catch {
            print("Failed to fetch portfolio: \(error)")
        }
        
        return nil
    }
    
    func deletePortfolio(_ portfolioId: UUID) {
        let context = coreDataStack.viewContext
        let fetchRequest: NSFetchRequest<PortfolioEntity> = PortfolioEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", portfolioId as CVarArg)
        
        do {
            if let entity = try context.fetch(fetchRequest).first {
                context.delete(entity)
                coreDataStack.save()
            }
        } catch {
            print("Failed to delete portfolio: \(error)")
        }
    }
}

// MARK: - TransactionRepository

class TransactionRepository {
    private let coreDataStack: CoreDataStack
    
    init(coreDataStack: CoreDataStack) {
        self.coreDataStack = coreDataStack
    }
    
    func saveTransaction(_ transaction: Transaction) {
        let context = coreDataStack.viewContext
        
        let fetchRequest: NSFetchRequest<TransactionEntity> = TransactionEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", transaction.id as CVarArg)
        
        do {
            let results = try context.fetch(fetchRequest)
            let entity = results.first ?? TransactionEntity(context: context)
            
            entity.id = transaction.id
            entity.type = transaction.type.rawValue
            entity.amount = NSDecimalNumber(decimal: transaction.amount).doubleValue
            entity.status = transaction.status.rawValue
            entity.date = transaction.date
            
            coreDataStack.save()
        } catch {
            print("Failed to save transaction: \(error)")
        }
    }
    
    func fetchTransactions(limit: Int = 50) -> [Transaction] {
        let context = coreDataStack.viewContext
        let fetchRequest: NSFetchRequest<TransactionEntity> = TransactionEntity.fetchRequest()
        fetchRequest.fetchLimit = limit
        fetchRequest.sortDescriptors = [NSSortDescriptor(key: "date", ascending: false)]
        
        do {
            let entities = try context.fetch(fetchRequest)
            return entities.compactMap { entity in
                guard let id = entity.id,
                      let type = entity.type,
                      let status = entity.status,
                      let date = entity.date else { return nil }
                
                // Note: This simplified Transaction initialization doesn't work with full model
                // Need to either use a simplified Transaction model for Core Data
                // or store all required fields
                return nil // TODO: Implement proper Transaction initialization
            }
        } catch {
            print("Failed to fetch transactions: \(error)")
            return []
        }
    }
    
    func deleteTransaction(_ transactionId: UUID) {
        let context = coreDataStack.viewContext
        let fetchRequest: NSFetchRequest<TransactionEntity> = TransactionEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", transactionId as CVarArg)
        
        do {
            if let entity = try context.fetch(fetchRequest).first {
                context.delete(entity)
                coreDataStack.save()
            }
        } catch {
            print("Failed to delete transaction: \(error)")
        }
    }
    
    func clearAllTransactions() {
        let context = coreDataStack.viewContext
        let fetchRequest: NSFetchRequest<NSFetchRequestResult> = TransactionEntity.fetchRequest()
        let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
        
        do {
            try context.execute(deleteRequest)
            coreDataStack.save()
        } catch {
            print("Failed to clear transactions: \(error)")
        }
    }
}

// MARK: - StatementRepository

class StatementRepository {
    private let coreDataStack: CoreDataStack
    
    init(coreDataStack: CoreDataStack) {
        self.coreDataStack = coreDataStack
    }
    
    func saveStatement(_ statement: Statement) {
        let context = coreDataStack.viewContext
        
        let fetchRequest: NSFetchRequest<StatementEntity> = StatementEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", statement.id as CVarArg)
        
        do {
            let results = try context.fetch(fetchRequest)
            let entity = results.first ?? StatementEntity(context: context)
            
            entity.id = statement.id
            // Map Statement properties to Entity fields
            // StatementEntity has fewer fields than old Statement model
            entity.investorId = statement.investorId
            entity.period = statement.period
            entity.url = statement.url
            entity.generatedAt = statement.generatedAt
            
            coreDataStack.save()
        } catch {
            print("Failed to save statement: \(error)")
        }
    }
    
    func fetchStatements() -> [Statement] {
        let context = coreDataStack.viewContext
        let fetchRequest: NSFetchRequest<StatementEntity> = StatementEntity.fetchRequest()
        fetchRequest.sortDescriptors = [NSSortDescriptor(key: "generatedAt", ascending: false)]
        
        do {
            let entities = try context.fetch(fetchRequest)
            return entities.compactMap { entity in
                guard let id = entity.id,
                      let investorId = entity.investorId,
                      let period = entity.period,
                      let url = entity.url,
                      let generatedAt = entity.generatedAt else { return nil }
                
                return Statement(
                    id: id,
                    investorId: investorId,
                    period: period,
                    url: url,
                    generatedAt: generatedAt
                )
            }
        } catch {
            print("Failed to fetch statements: \(error)")
            return []
        }
    }
    
    func deleteStatement(_ statementId: UUID) {
        let context = coreDataStack.viewContext
        let fetchRequest: NSFetchRequest<StatementEntity> = StatementEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", statementId as CVarArg)
        
        do {
            if let entity = try context.fetch(fetchRequest).first {
                context.delete(entity)
                coreDataStack.save()
            }
        } catch {
            print("Failed to delete statement: \(error)")
        }
    }
}

// MARK: - WithdrawalRepository

class WithdrawalRepository {
    private let coreDataStack: CoreDataStack
    
    init(coreDataStack: CoreDataStack) {
        self.coreDataStack = coreDataStack
    }
    
    func saveWithdrawalRequest(_ request: WithdrawalRequest) {
        let context = coreDataStack.viewContext
        
        let fetchRequest: NSFetchRequest<WithdrawalEntity> = WithdrawalEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", request.id as CVarArg)
        
        do {
            let results = try context.fetch(fetchRequest)
            let entity = results.first ?? WithdrawalEntity(context: context)
            
            entity.id = request.id
            entity.amount = request.amount
            entity.status = request.status.rawValue
            entity.requestedAt = request.requestedAt
            entity.processedAt = request.processedAt
            
            coreDataStack.save()
        } catch {
            print("Failed to save withdrawal request: \(error)")
        }
    }
    
    func fetchWithdrawalRequests() -> [WithdrawalRequest] {
        let context = coreDataStack.viewContext
        let fetchRequest: NSFetchRequest<WithdrawalEntity> = WithdrawalEntity.fetchRequest()
        fetchRequest.sortDescriptors = [NSSortDescriptor(key: "requestedAt", ascending: false)]
        
        do {
            let entities = try context.fetch(fetchRequest)
            return entities.compactMap { entity in
                guard let id = entity.id,
                      let status = entity.status,
                      let requestedAt = entity.requestedAt else { return nil }
                
                return WithdrawalRequest(
                    id: id,
                    amount: entity.amount,
                    status: WithdrawalStatus(rawValue: status) ?? .pending,
                    requestedAt: requestedAt,
                    processedAt: entity.processedAt
                )
            }
        } catch {
            print("Failed to fetch withdrawal requests: \(error)")
            return []
        }
    }
    
    func updateWithdrawalStatus(_ requestId: UUID, status: WithdrawalStatus) {
        let context = coreDataStack.viewContext
        let fetchRequest: NSFetchRequest<WithdrawalEntity> = WithdrawalEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", requestId as CVarArg)
        
        do {
            if let entity = try context.fetch(fetchRequest).first {
                entity.status = status.rawValue
                if status == .completed || status == .rejected {
                    entity.processedAt = Date()
                }
                coreDataStack.save()
            }
        } catch {
            print("Failed to update withdrawal status: \(error)")
        }
    }
}

// MARK: - Core Data Entity Extensions

extension PortfolioEntity {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<PortfolioEntity> {
        return NSFetchRequest<PortfolioEntity>(entityName: "PortfolioEntity")
    }
}

extension TransactionEntity {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<TransactionEntity> {
        return NSFetchRequest<TransactionEntity>(entityName: "TransactionEntity")
    }
}

extension StatementEntity {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<StatementEntity> {
        return NSFetchRequest<StatementEntity>(entityName: "StatementEntity")
    }
}

extension WithdrawalEntity {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<WithdrawalEntity> {
        return NSFetchRequest<WithdrawalEntity>(entityName: "WithdrawalEntity")
    }
}
