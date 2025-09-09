//
//  CoreDataModel.swift
//  IndigoInvestor
//
//  Core Data model definitions for missing entities
//

import Foundation
import CoreData

// MARK: - PortfolioEntity

@objc(PortfolioEntity)
public class PortfolioEntity: NSManagedObject {
    @NSManaged public var id: UUID?
    @NSManaged public var investorId: UUID?
    @NSManaged public var totalInvested: Double
    @NSManaged public var currentValue: Double
    @NSManaged public var lastUpdated: Date?
    @NSManaged public var synced: Bool
}

// MARK: - TransactionEntity

@objc(TransactionEntity)
public class TransactionEntity: NSManagedObject {
    @NSManaged public var id: UUID?
    @NSManaged public var investorId: UUID?
    @NSManaged public var type: String?
    @NSManaged public var amount: Double
    @NSManaged public var date: Date?
    @NSManaged public var details: String?
    @NSManaged public var status: String?
    @NSManaged public var synced: Bool
}

// MARK: - StatementEntity

@objc(StatementEntity)
public class StatementEntity: NSManagedObject {
    @NSManaged public var id: UUID?
    @NSManaged public var investorId: UUID?
    @NSManaged public var period: String?
    @NSManaged public var url: String?
    @NSManaged public var generatedAt: Date?
    @NSManaged public var synced: Bool
}

// MARK: - WithdrawalEntity

@objc(WithdrawalEntity)
public class WithdrawalEntity: NSManagedObject {
    @NSManaged public var id: UUID?
    @NSManaged public var investorId: UUID?
    @NSManaged public var amount: Double
    @NSManaged public var status: String?
    @NSManaged public var requestedAt: Date?
    @NSManaged public var processedAt: Date?
    @NSManaged public var synced: Bool
}

// MARK: - Core Data Model Creation

extension CoreDataStack {
    static func createModel() -> NSManagedObjectModel {
        let model = NSManagedObjectModel()
        
        // Portfolio Entity
        let portfolioEntity = NSEntityDescription()
        portfolioEntity.name = "PortfolioEntity"
        portfolioEntity.managedObjectClassName = "PortfolioEntity"
        
        let portfolioAttributes: [(String, NSAttributeType)] = [
            ("id", .UUIDAttributeType),
            ("investorId", .UUIDAttributeType),
            ("totalInvested", .doubleAttributeType),
            ("currentValue", .doubleAttributeType),
            ("lastUpdated", .dateAttributeType),
            ("synced", .booleanAttributeType)
        ]
        
        portfolioEntity.properties = portfolioAttributes.map { name, type in
            let attribute = NSAttributeDescription()
            attribute.name = name
            attribute.attributeType = type
            attribute.isOptional = name != "totalInvested" && name != "currentValue" && name != "synced"
            return attribute
        }
        
        // Transaction Entity
        let transactionEntity = NSEntityDescription()
        transactionEntity.name = "TransactionEntity"
        transactionEntity.managedObjectClassName = "TransactionEntity"
        
        let transactionAttributes: [(String, NSAttributeType)] = [
            ("id", .UUIDAttributeType),
            ("investorId", .UUIDAttributeType),
            ("type", .stringAttributeType),
            ("amount", .doubleAttributeType),
            ("date", .dateAttributeType),
            ("details", .stringAttributeType),
            ("status", .stringAttributeType),
            ("synced", .booleanAttributeType)
        ]
        
        transactionEntity.properties = transactionAttributes.map { name, type in
            let attribute = NSAttributeDescription()
            attribute.name = name
            attribute.attributeType = type
            attribute.isOptional = name != "amount" && name != "synced"
            return attribute
        }
        
        // Statement Entity
        let statementEntity = NSEntityDescription()
        statementEntity.name = "StatementEntity"
        statementEntity.managedObjectClassName = "StatementEntity"
        
        let statementAttributes: [(String, NSAttributeType)] = [
            ("id", .UUIDAttributeType),
            ("investorId", .UUIDAttributeType),
            ("period", .stringAttributeType),
            ("url", .stringAttributeType),
            ("generatedAt", .dateAttributeType),
            ("synced", .booleanAttributeType)
        ]
        
        statementEntity.properties = statementAttributes.map { name, type in
            let attribute = NSAttributeDescription()
            attribute.name = name
            attribute.attributeType = type
            attribute.isOptional = name != "synced"
            return attribute
        }
        
        // Withdrawal Entity
        let withdrawalEntity = NSEntityDescription()
        withdrawalEntity.name = "WithdrawalEntity"
        withdrawalEntity.managedObjectClassName = "WithdrawalEntity"
        
        let withdrawalAttributes: [(String, NSAttributeType)] = [
            ("id", .UUIDAttributeType),
            ("investorId", .UUIDAttributeType),
            ("amount", .doubleAttributeType),
            ("status", .stringAttributeType),
            ("requestedAt", .dateAttributeType),
            ("processedAt", .dateAttributeType),
            ("synced", .booleanAttributeType)
        ]
        
        withdrawalEntity.properties = withdrawalAttributes.map { name, type in
            let attribute = NSAttributeDescription()
            attribute.name = name
            attribute.attributeType = type
            attribute.isOptional = name != "amount" && name != "synced"
            return attribute
        }
        
        // Add entities to model
        model.entities = [portfolioEntity, transactionEntity, statementEntity, withdrawalEntity]
        
        return model
    }
}
