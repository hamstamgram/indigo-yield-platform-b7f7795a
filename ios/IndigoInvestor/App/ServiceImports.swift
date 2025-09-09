//
//  ServiceImports.swift
//  IndigoInvestor
//
//  Imports all service definitions for the app
//

import Foundation

// Re-export all services and types for use throughout the app
// This helps Xcode find all the types even if the project file isn't perfectly configured

// Services
typealias AuthService = IndigoInvestor.AuthService
typealias PortfolioService = IndigoInvestor.PortfolioService  
typealias TransactionService = IndigoInvestor.TransactionService
typealias DocumentService = IndigoInvestor.DocumentService
typealias WithdrawalService = IndigoInvestor.WithdrawalService
typealias AdminService = IndigoInvestor.AdminService
typealias StorageService = IndigoInvestor.StorageService
typealias RealtimeService = IndigoInvestor.RealtimeService
typealias OfflineManager = IndigoInvestor.OfflineManager

// Repositories
typealias PortfolioRepository = IndigoInvestor.PortfolioRepository
typealias TransactionRepository = IndigoInvestor.TransactionRepository
typealias StatementRepository = IndigoInvestor.StatementRepository
typealias WithdrawalRepository = IndigoInvestor.WithdrawalRepository

// ViewModels
typealias PortfolioViewModel = IndigoInvestor.PortfolioViewModel
typealias TransactionViewModel = IndigoInvestor.TransactionViewModel
typealias AdminDashboardViewModel = IndigoInvestor.AdminDashboardViewModel
typealias WithdrawalViewModel = IndigoInvestor.WithdrawalViewModel

// Core Data
typealias CoreDataStack = IndigoInvestor.CoreDataStack
