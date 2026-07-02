
    
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select claim_id
from "dashboard"."main"."stg_claims"
where claim_id is null



  
  
      
    ) dbt_internal_test