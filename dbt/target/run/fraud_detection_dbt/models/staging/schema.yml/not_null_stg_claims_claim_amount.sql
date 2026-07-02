
    
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select claim_amount
from "dashboard"."main"."stg_claims"
where claim_amount is null



  
  
      
    ) dbt_internal_test